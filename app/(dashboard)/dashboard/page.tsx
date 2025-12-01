import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { UrgentItemsCard } from '@/components/UrgentItemsCard';
import { ExpiringLeasesCard } from '@/components/ExpiringLeasesCard';
import { FiFileText, FiHome, FiUsers, FiPlus, FiArrowRight, FiAward, FiAlertCircle, FiClock, FiDollarSign, FiCheckCircle } from 'react-icons/fi';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  // Fetch counts
  const { count: documentCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  const { count: propertyCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  const { count: tenantCount } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  // Fetch all properties with their details for the map
  const { data: properties } = await supabase
    .from('properties')
    .select('id, address_line1, address_line2, city, state, zip, unit_count, property_type, status, monthly_rent, latitude, longitude')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  // Fetch tenant counts per property
  const { data: tenantsByProperty } = await supabase
    .from('tenants')
    .select('property_id')
    .eq('user_id', user?.id)
    .eq('status', 'active');

  // Fetch tenants with full data for upcoming items
  const { data: activeTenants } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, rent_amount, lease_end, property_id, unit_number, status, email')
    .eq('user_id', user?.id)
    .eq('status', 'active');

  // Fetch late rent documents for current month to track status
  // Use Central Time for consistent behavior across environments
  const nowCentral = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const startOfMonth = new Date(nowCentral.getFullYear(), nowCentral.getMonth(), 1).toISOString();
  const { data: lateRentDocs } = await supabase
    .from('documents')
    .select('id, title, tenant_id, signature_request_id, signature_status, created_at')
    .eq('user_id', user?.id)
    .eq('document_type', 'late_rent')
    .gte('created_at', startOfMonth);

  // Fetch lease renewal documents for tracking
  const { data: renewalDocs } = await supabase
    .from('documents')
    .select('id, title, tenant_id, signature_request_id, signature_status, created_at')
    .eq('user_id', user?.id)
    .eq('document_type', 'lease_renewal')
    .gte('created_at', startOfMonth);

  // Build lookup maps for document status by tenant
  const lateRentDocsByTenant: Record<string, { id: string; sent: boolean; status: string | null; title: string }> = {};
  lateRentDocs?.forEach(doc => {
    if (doc.tenant_id) {
      lateRentDocsByTenant[doc.tenant_id] = {
        id: doc.id,
        sent: !!doc.signature_request_id,
        status: doc.signature_status,
        title: doc.title,
      };
    }
  });

  const renewalDocsByTenant: Record<string, { id: string; sent: boolean; status: string | null; title: string }> = {};
  renewalDocs?.forEach(doc => {
    if (doc.tenant_id) {
      renewalDocsByTenant[doc.tenant_id] = {
        id: doc.id,
        sent: !!doc.signature_request_id,
        status: doc.signature_status,
        title: doc.title,
      };
    }
  });

  // Calculate upcoming items - reuse Central Time date from above
  const today = nowCentral;
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Get upcoming rent due (tenants with rent, due on 1st of month)
  const rentDueSoon = activeTenants?.filter(t => {
    if (!t.rent_amount) return false;
    // If we're past the 15th, show next month's rent as upcoming
    // If we're in the first 15 days, rent is currently due
    return currentDay >= 25 || currentDay <= 5;
  }) || [];

  // Late rent: If past the 5th and tenant has rent
  const lateRent = activeTenants?.filter(t => {
    if (!t.rent_amount) return false;
    return currentDay > 5;
  }) || [];

  // Lease expirations: leases ending within 60 days
  const sixtyDaysFromNow = new Date(today);
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const expiringLeases = activeTenants?.filter(t => {
    if (!t.lease_end) return false;
    const leaseEnd = new Date(t.lease_end);
    return leaseEnd >= today && leaseEnd <= sixtyDaysFromNow;
  }).sort((a, b) => new Date(a.lease_end!).getTime() - new Date(b.lease_end!).getTime()) || [];

  // Build property lookup for names
  const propertyLookup: Record<string, string> = {};
  properties?.forEach(p => {
    propertyLookup[p.id] = p.address_line1;
  });

  // Build tenant count map
  const tenantCounts: Record<string, number> = {};
  tenantsByProperty?.forEach(t => {
    if (t.property_id) {
      tenantCounts[t.property_id] = (tenantCounts[t.property_id] || 0) + 1;
    }
  });

  // Calculate total late rent amount
  const totalLateRent = lateRent.reduce((sum, t) => sum + (t.rent_amount || 0), 0);

  // Calculate rent collected vs expected per property
  const propertyRentStatus = properties?.map(property => {
    const propertyTenants = activeTenants?.filter(t => t.property_id === property.id) || [];
    // Use tenant's rent_amount if set, otherwise fall back to property's monthly_rent
    const collectedRent = propertyTenants.reduce((sum, t) => sum + (t.rent_amount || property.monthly_rent || 0), 0);
    const expectedRent = property.monthly_rent
      ? property.monthly_rent * (property.unit_count || 1)
      : (propertyTenants.length > 0 ? propertyTenants[0].rent_amount! * (property.unit_count || 1) : 0);
    const hasLateRent = currentDay > 5 && collectedRent < expectedRent;

    return {
      ...property,
      collectedRent,
      expectedRent,
      hasLateRent,
      tenants: propertyTenants,
    };
  }) || [];

  // Calculate totals
  const totalCollected = propertyRentStatus.reduce((sum, p) => sum + p.collectedRent, 0);
  const totalExpected = propertyRentStatus.reduce((sum, p) => sum + p.expectedRent, 0);

  const subscriptionTier = profile?.subscription_tier || 'free';
  const documentsRemaining = subscriptionTier === 'free'
    ? Math.max(0, 3 - (profile?.documents_this_month || 0))
    : 'Unlimited';

  const tierDisplay = {
    free: { label: 'Free Account', badge: '' },
    basic: { label: 'Basic', badge: 'bg-blue-100 text-blue-700 border border-blue-200' },
    pro: { label: 'Pro', badge: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-white shadow-lg animate-pulse' }
  };

  return (
    <div>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-blue-100">Here&apos;s an overview of your rental portfolio.</p>
          </div>
          <Link
            href="/dashboard/documents/new"
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-lg"
          >
            <FiPlus className="w-5 h-5" />
            Create Document
          </Link>
        </div>
      </div>

      {/* Stats Cards - pulled up into the header */}
      <div className="grid md:grid-cols-4 gap-6 mb-8 -mt-6">
        <StatCard
          icon={<FiFileText className="w-6 h-6" />}
          label="Documents"
          value={documentCount || 0}
          href="/dashboard/documents"
          color="cyan"
        />
        <StatCard
          icon={<FiHome className="w-6 h-6" />}
          label="Properties"
          value={propertyCount || 0}
          href="/dashboard/properties"
          color="blue"
        />
        <StatCard
          icon={<FiUsers className="w-6 h-6" />}
          label="Tenants"
          value={tenantCount || 0}
          href="/dashboard/tenants"
          color="indigo"
        />
        <StatCard
          icon={<FiFileText className="w-6 h-6" />}
          label="Docs Remaining"
          value={documentsRemaining}
          subtext={subscriptionTier === 'free' ? 'this month' : ''}
          href="/dashboard/pricing"
          color="gradient"
          subscriptionTier={subscriptionTier as 'free' | 'basic' | 'pro'}
          tierDisplay={tierDisplay[subscriptionTier as keyof typeof tierDisplay]}
        />
      </div>

      {/* Main Content: Action-Focused Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Urgent Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Actions Card */}
          <UrgentItemsCard
            lateRent={lateRent}
            totalLateRent={totalLateRent}
            propertyLookup={propertyLookup}
            properties={properties || []}
            landlordName={profile?.full_name || ''}
            lateRentDocsByTenant={lateRentDocsByTenant}
            today={today}
          />

          {/* This Month's Rent Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FiDollarSign className="w-5 h-5 text-green-600" />
                  This Month&apos;s Rent
                </CardTitle>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    <span className={totalCollected >= totalExpected ? 'text-green-600' : 'text-amber-600'}>
                      ${totalCollected.toLocaleString()}
                    </span>
                    <span className="text-gray-400 font-normal"> / ${totalExpected.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0}% collected
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {propertyRentStatus.length > 0 ? (
                <div className="space-y-2">
                  {propertyRentStatus.map(property => (
                    <Link
                      key={property.id}
                      href={`/dashboard/properties/${property.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{property.address_line1}</p>
                        <p className="text-xs text-muted-foreground">{property.city}, {property.state}</p>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className="font-medium text-sm">${property.collectedRent.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">of ${property.expectedRent.toLocaleString()}</p>
                        </div>
                        {property.collectedRent >= property.expectedRent && property.expectedRent > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <FiCheckCircle className="w-3 h-3" />
                            Paid
                          </span>
                        ) : property.hasLateRent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <FiAlertCircle className="w-3 h-3" />
                            Late
                          </span>
                        ) : property.expectedRent === 0 ? (
                          <span className="text-xs text-muted-foreground">No tenants</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            <FiClock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No properties yet</p>
                  <Link href="/dashboard/properties" className="text-blue-600 hover:underline text-sm">
                    Add your first property
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Upcoming & Quick Actions */}
        <div className="space-y-6">
          {/* Upcoming Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FiClock className="w-5 h-5 text-amber-600" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rent Due Soon */}
              {rentDueSoon.length > 0 && currentDay >= 25 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-600 flex items-center gap-2">
                    <FiDollarSign className="w-4 h-4" />
                    Rent Due on 1st ({rentDueSoon.length})
                  </p>
                  <div className="space-y-2">
                    {rentDueSoon.slice(0, 3).map(tenant => (
                      <div key={tenant.id} className="p-2 bg-amber-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-xs">{tenant.first_name} {tenant.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tenant.property_id ? propertyLookup[tenant.property_id] : ''}
                            </p>
                          </div>
                          <p className="font-semibold text-amber-600 text-sm">${tenant.rent_amount?.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expiring Leases */}
              <ExpiringLeasesCard
                expiringLeases={expiringLeases}
                propertyLookup={propertyLookup}
                properties={properties || []}
                landlordName={profile?.full_name || ''}
                renewalDocsByTenant={renewalDocsByTenant}
                today={today}
              />

              {/* Empty state */}
              {(currentDay < 25 || rentDueSoon.length === 0) && expiringLeases.length === 0 && lateRent.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiCheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-green-600">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No upcoming items</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Add */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/dashboard/properties"
                className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <FiHome className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="font-medium text-sm">Add Property</p>
              </Link>
              <Link
                href="/dashboard/tenants"
                className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <FiUsers className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <p className="font-medium text-sm">Add Tenant</p>
              </Link>
              <Link
                href="/dashboard/documents/new"
                className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="p-1.5 bg-cyan-100 rounded-lg">
                  <FiFileText className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <p className="font-medium text-sm">Create Document</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  subtext,
  color = 'blue',
  subscriptionTier,
  tierDisplay
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  subtext?: string;
  color?: 'cyan' | 'blue' | 'indigo' | 'gradient';
  subscriptionTier?: 'free' | 'basic' | 'pro';
  tierDisplay?: { label: string; badge: string };
}) {
  const colorStyles = {
    cyan: {
      border: '!border-cyan-200 hover:!border-cyan-400',
      icon: 'text-cyan-600 bg-cyan-50',
      accent: 'text-cyan-600'
    },
    blue: {
      border: '!border-blue-200 hover:!border-blue-400',
      icon: 'text-blue-600 bg-blue-50',
      accent: 'text-blue-600'
    },
    indigo: {
      border: '!border-indigo-200 hover:!border-indigo-400',
      icon: 'text-indigo-600 bg-indigo-50',
      accent: 'text-indigo-600'
    },
    gradient: {
      border: '!border-transparent',
      icon: 'text-white',
      accent: 'text-white'
    }
  };

  const styles = colorStyles[color];

  // Subscription tier cards - compact design
  if (color === 'gradient' && subscriptionTier && tierDisplay) {
    if (subscriptionTier === 'pro') {
      return (
        <Link href={href}>
          <div className="relative bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer h-full group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="py-2 px-3 h-full flex items-center gap-2 relative">
              <div className="p-1.5 bg-white/20 rounded">
                <FiFileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white">Pro Plan</p>
              </div>
              <span className="p-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow">
                <FiAward className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>
      );
    } else if (subscriptionTier === 'basic') {
      return (
        <Link href={href}>
          <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
            <div className="py-2 px-3 h-full flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded">
                <FiFileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white">Basic Plan</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
                <FiAward className="w-3 h-3 text-blue-200" />
                Basic
              </span>
            </div>
          </div>
        </Link>
      );
    } else {
      // Free tier
      return (
        <Link href={href}>
          <Card className="border border-gray-200 hover:border-gray-300 transition-all cursor-pointer hover:shadow-md h-full">
            <CardContent className="py-2 px-3 h-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gray-50 rounded">
                  <FiFileText className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-gray-700">Free Plan</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                  <FiAward className="w-3 h-3 text-gray-400" />
                  Free
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    }
  }

  // Regular stat cards - compact inline design
  return (
    <Link href={href}>
      <Card className={`${styles.border} border transition-all cursor-pointer hover:shadow-md`}>
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${styles.icon}`}>
              <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-xl font-bold ${styles.accent}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <FiArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


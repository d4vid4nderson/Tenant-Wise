import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FiFileText, FiHome, FiUsers, FiPlus, FiArrowRight, FiAward, FiMap } from 'react-icons/fi';
import DashboardMap from '@/components/DashboardMap';

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

  // Build tenant count map
  const tenantCounts: Record<string, number> = {};
  tenantsByProperty?.forEach(t => {
    if (t.property_id) {
      tenantCounts[t.property_id] = (tenantCounts[t.property_id] || 0) + 1;
    }
  });

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

      {/* Main Content: Map (3/4) + Quick Actions (1/4) */}
      <div className="grid lg:grid-cols-4 gap-6 items-stretch">
        {/* Portfolio Map - Takes up 3/4 */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FiMap className="w-5 h-5 text-blue-600" />
                  Portfolio Map
                </CardTitle>
                <Link
                  href="/dashboard/properties"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All Properties
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="h-full min-h-[400px]">
                <DashboardMap
                  properties={properties || []}
                  tenantCounts={tenantCounts}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar - Takes up 1/4 */}
        <div className="flex flex-col gap-6">
          {/* Create Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiFileText className="w-5 h-5 text-cyan-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionButton
                href="/dashboard/documents/new?type=late_rent"
                label="Late Rent Notice"
                description="Texas-compliant 3-day notice"
              />
              <QuickActionButton
                href="/dashboard/documents/new?type=lease_renewal"
                label="Lease Renewal"
                description="Generate renewal offer"
              />
              <QuickActionButton
                href="/dashboard/documents/new?type=deposit_return"
                label="Deposit Return"
                description="Itemized deposit letter"
              />
              <QuickActionButton
                href="/dashboard/documents/new?type=maintenance"
                label="Maintenance Response"
                description="Acknowledge repair requests"
              />
            </CardContent>
          </Card>

          {/* Quick Add */}
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm">Add New</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1">
              <Link
                href="/dashboard/properties"
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiHome className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Add Property</p>
                  <p className="text-xs text-muted-foreground">Add a new rental property</p>
                </div>
              </Link>
              <Link
                href="/dashboard/tenants"
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FiUsers className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Add Tenant</p>
                  <p className="text-xs text-muted-foreground">Add a new tenant profile</p>
                </div>
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
      border: 'border-cyan-200 hover:border-cyan-400',
      icon: 'text-cyan-500 bg-cyan-50',
      accent: 'text-cyan-600'
    },
    blue: {
      border: 'border-blue-200 hover:border-blue-400',
      icon: 'text-blue-500 bg-blue-50',
      accent: 'text-blue-600'
    },
    indigo: {
      border: 'border-indigo-200 hover:border-indigo-400',
      icon: 'text-indigo-500 bg-indigo-50',
      accent: 'text-indigo-600'
    },
    gradient: {
      border: 'border-transparent',
      icon: 'text-white',
      accent: 'text-white'
    }
  };

  const styles = colorStyles[color];

  if (color === 'gradient' && subscriptionTier && tierDisplay) {
    if (subscriptionTier === 'pro') {
      return (
        <Link href={href}>
          <div className="relative bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-xl p-[2px] shadow-xl hover:shadow-2xl transition-all cursor-pointer h-full group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-xl p-6 h-full flex flex-col relative">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-white/20 rounded-lg text-white">{icon}</div>
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-white shadow-lg flex items-center gap-1.5">
                  <FiAward className="w-3.5 h-3.5" />
                  {tierDisplay.label}
                </span>
              </div>
              <div className="mt-4 flex-1 flex flex-col justify-end">
                <p className="text-sm font-semibold text-white">Unlimited Properties & Tenants</p>
                <p className="text-xs text-blue-100 mt-1">ACH Rent Collection + Priority Support</p>
              </div>
            </div>
          </div>
        </Link>
      );
    } else if (subscriptionTier === 'basic') {
      return (
        <Link href={href}>
          <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-xl p-[2px] shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
            <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-white/20 rounded-lg text-white">{icon}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierDisplay.badge}`}>
                  {tierDisplay.label}
                </span>
              </div>
              <div className="mt-4 flex-1 flex flex-col justify-end">
                <p className="text-sm font-semibold text-white">Unlimited Docs + Legal AI</p>
                <p className="text-xs text-blue-100">1 Property, 1 Tenant</p>
              </div>
            </div>
          </div>
        </Link>
      );
    } else {
      return (
        <Link href={href}>
          <Card className="border-2 border-gray-200 hover:border-gray-400 transition-all cursor-pointer hover:shadow-md h-full">
            <CardContent className="pt-6 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg text-gray-500 bg-gray-50">{icon}</div>
                <span className="text-xs text-muted-foreground font-medium">
                  {tierDisplay.label}
                </span>
              </div>
              <div className="mt-4 flex-1 flex flex-col justify-end">
                <p className="text-3xl font-bold text-gray-700">{value}</p>
                <p className="text-sm text-muted-foreground">{label} {subtext && <span className="text-xs">({subtext})</span>}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    }
  }

  return (
    <Link href={href}>
      <Card className={`${styles.border} border-2 transition-all cursor-pointer hover:shadow-md`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${styles.icon}`}>{icon}</div>
            <FiArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-4">
            <p className={`text-3xl font-bold ${styles.accent}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{label} {subtext && <span className="text-xs">({subtext})</span>}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickActionButton({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg transition-all hover:bg-gray-50 hover:border-gray-200"
    >
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <FiPlus className="w-4 h-4 text-gray-400" />
    </Link>
  );
}

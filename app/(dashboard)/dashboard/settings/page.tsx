'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { FiUser, FiMail, FiLock, FiCreditCard, FiBell, FiTrash2, FiCheck, FiAlertCircle, FiX, FiAlertTriangle, FiHome, FiUsers } from 'react-icons/fi';
import BillingModal from '@/components/BillingModal';

interface Property {
  id: string;
  address_line1: string;
  city: string;
  state: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  property_id: string | null;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('TX');
  const [zip, setZip] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Billing modal state
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Plan change modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalStep, setPlanModalStep] = useState(0); // 0 = plan selection
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [processingChange, setProcessingChange] = useState(false);

  // Delete account confirmation state
  const [deleteAccountStep, setDeleteAccountStep] = useState<0 | 1 | 2>(0); // 0 = hidden, 1 = first confirm, 2 = final confirm

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setEmail(user?.email || '');

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profile);
        setFullName(profile?.full_name || '');
        setPhone(profile?.phone || '');
        setAddressLine1(profile?.address_line1 || '');
        setAddressLine2(profile?.address_line2 || '');
        setCity(profile?.city || '');
        setState(profile?.state || 'TX');
        setZip(profile?.zip || '');

        // Fetch properties
        const { data: props } = await supabase
          .from('properties')
          .select('id, address_line1, city, state')
          .eq('user_id', user.id);
        setProperties(props || []);

        // Fetch tenants
        const { data: tents } = await supabase
          .from('tenants')
          .select('id, first_name, last_name, property_id')
          .eq('user_id', user.id);
        setTenants(tents || []);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      showMessage('error', 'Failed to update profile');
    } else {
      showMessage('success', 'Profile updated successfully');
    }
    setSaving(false);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      showMessage('error', error.message);
    } else {
      showMessage('success', 'Confirmation email sent to your new address. Please check your inbox.');
    }
    setSaving(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      showMessage('error', error.message);
    } else {
      showMessage('success', 'Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  const handleDeleteAccount = () => {
    setDeleteAccountStep(1);
  };

  const handleFirstDeleteConfirm = () => {
    setDeleteAccountStep(2);
  };

  const handleFinalDeleteConfirm = () => {
    setDeleteAccountStep(0);
    showMessage('error', 'Please contact support to delete your account.');
  };

  const openPlanModal = () => {
    setShowPlanModal(true);
    setPlanModalStep(0);
    setSelectedPlan(null);
    setSelectedProperty(properties.length > 0 ? properties[0].id : null);
    setDeleteConfirmation('');
  };

  const closeModal = () => {
    setShowPlanModal(false);
    setPlanModalStep(0);
    setSelectedPlan(null);
    setSelectedProperty(null);
    setDeleteConfirmation('');
  };

  const handlePlanNext = () => {
    if (!selectedPlan || selectedPlan === profile?.subscription_tier) return;

    // If upgrading, just show confirmation
    if (
      (profile?.subscription_tier === 'free' && (selectedPlan === 'basic' || selectedPlan === 'pro')) ||
      (profile?.subscription_tier === 'basic' && selectedPlan === 'pro')
    ) {
      setPlanModalStep(5); // Upgrade confirmation step
      return;
    }

    // If downgrading from Pro to Basic or Free
    if (profile?.subscription_tier === 'pro') {
      setPlanModalStep(1); // What you're losing
      return;
    }

    // If downgrading from Basic to Free
    if (profile?.subscription_tier === 'basic' && selectedPlan === 'free') {
      setPlanModalStep(1); // What you're losing
      return;
    }
  };

  const getTenantsToDelete = () => {
    if (!selectedProperty) return tenants;
    return tenants.filter(t => t.property_id !== selectedProperty);
  };

  const getTenantsToKeep = () => {
    if (!selectedProperty) return [];
    return tenants.filter(t => t.property_id === selectedProperty);
  };

  const getPropertiesToDelete = () => {
    if (!selectedProperty) return properties;
    return properties.filter(p => p.id !== selectedProperty);
  };

  const handlePlanChange = async () => {
    if (!selectedPlan) return;

    // For downgrades, require DELETE confirmation
    if (isDowngrade() && deleteConfirmation !== 'DELETE') return;

    setProcessingChange(true);

    try {
      // If downgrading from Pro, handle property/tenant deletion
      if (profile?.subscription_tier === 'pro' && (selectedPlan === 'basic' || selectedPlan === 'free')) {
        // Delete properties that aren't selected (for basic, keep 1; for free, delete all)
        if (selectedPlan === 'basic' && properties.length > 1 && selectedProperty) {
          const propertyIdsToDelete = getPropertiesToDelete().map(p => p.id);

          await supabase
            .from('tenants')
            .delete()
            .in('property_id', propertyIdsToDelete);

          await supabase
            .from('properties')
            .delete()
            .in('id', propertyIdsToDelete);
        }

        // Delete tenants not linked to the kept property
        const tenantsToDelete = getTenantsToDelete();
        if (tenantsToDelete.length > 0) {
          await supabase
            .from('tenants')
            .delete()
            .in('id', tenantsToDelete.map(t => t.id));
        }
      }

      // If downgrading from Basic to Free, handle limitations
      if (profile?.subscription_tier === 'basic' && selectedPlan === 'free') {
        // Keep only 1 property for free tier too
        if (properties.length > 1 && selectedProperty) {
          const propertyIdsToDelete = getPropertiesToDelete().map(p => p.id);

          await supabase
            .from('tenants')
            .delete()
            .in('property_id', propertyIdsToDelete);

          await supabase
            .from('properties')
            .delete()
            .in('id', propertyIdsToDelete);
        }
      }

      // Update profile tier
      await supabase
        .from('profiles')
        .update({
          subscription_tier: selectedPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Update local state
      setProfile({ ...profile, subscription_tier: selectedPlan });
      if (isDowngrade() && selectedProperty) {
        setProperties(properties.filter(p => p.id === selectedProperty));
        setTenants(getTenantsToKeep());
      }

      closeModal();
      showMessage('success', `Your plan has been changed to ${tierLabels[selectedPlan]}.`);
    } catch (error) {
      showMessage('error', 'Failed to change plan. Please try again.');
    } finally {
      setProcessingChange(false);
    }
  };

  const isDowngrade = () => {
    if (!selectedPlan || !profile?.subscription_tier) return false;
    const tiers = ['free', 'basic', 'pro'];
    return tiers.indexOf(selectedPlan) < tiers.indexOf(profile.subscription_tier);
  };

  const isUpgrade = () => {
    if (!selectedPlan || !profile?.subscription_tier) return false;
    const tiers = ['free', 'basic', 'pro'];
    return tiers.indexOf(selectedPlan) > tiers.indexOf(profile.subscription_tier);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const tierLabels: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro'
  };

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white'
  };

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);

  return (
    <div>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <h1 className="text-2xl font-bold text-white">Landlord Settings</h1>
        <p className="text-purple-100">Manage your account settings and landlord information</p>
      </div>

      <div className="max-w-4xl mx-auto -mt-6">

      {/* Message Toast */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <FiCheck className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <FiUser className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <CardTitle>Landlord Information</CardTitle>
              <CardDescription>Your information will be used to populate documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Mailing Address</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Street Address</label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Suite 100"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-2">
                    <label className="block text-sm font-medium mb-2">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Austin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TX">Texas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="78701"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiMail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Change your email address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
              <p className="text-sm text-muted-foreground mt-2">
                You will receive a confirmation email at your new address.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || email === user?.email}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating...' : 'Update Email'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <FiLock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={saving || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiCreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-muted-foreground">
                {profile?.subscription_tier === 'free'
                  ? `${3 - (profile?.documents_this_month || 0)} documents remaining this month`
                  : 'Unlimited documents'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierColors[profile?.subscription_tier || 'free']}`}>
              {tierLabels[profile?.subscription_tier || 'free']}
            </span>
          </div>

          <div className="flex items-center justify-between">
            {profile?.subscription_tier !== 'free' && (
              <button
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setShowBillingModal(true)}
              >
                Manage Billing
              </button>
            )}
            {profile?.subscription_tier === 'free' && <div />}
            <button
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={openPlanModal}
            >
              Change Plan
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <FiBell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive updates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Document Reminders</p>
                <p className="text-sm text-muted-foreground">Get notified about lease renewals and important dates</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-blue-500" />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Product Updates</p>
                <p className="text-sm text-muted-foreground">Learn about new features and improvements</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-blue-500" />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tips & Best Practices</p>
                <p className="text-sm text-muted-foreground">Receive landlord tips and Texas law updates</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-blue-500" />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <FiTrash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete Account
          </button>
        </CardContent>
      </Card>
      </div>

      {/* Plan Change Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                {planModalStep === 0 ? (
                  <FiCreditCard className="w-6 h-6 text-white" />
                ) : (
                  <FiAlertTriangle className="w-6 h-6 text-white" />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {planModalStep === 0 ? 'Change Plan' : `Downgrade to ${tierLabels[selectedPlan || 'basic']}`}
                </h2>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg transition-colors text-white/80 hover:text-white hover:bg-white/20">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 0: Plan Selection */}
              {planModalStep === 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Select a plan:</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose the plan that best fits your needs.
                  </p>

                  <div className="space-y-3 mb-6">
                    {/* Free Plan */}
                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                        profile?.subscription_tier === 'free'
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : selectedPlan === 'free'
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value="free"
                        checked={selectedPlan === 'free'}
                        onChange={() => setSelectedPlan('free')}
                        disabled={profile?.subscription_tier === 'free'}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Free</p>
                          {profile?.subscription_tier === 'free' && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Current Plan</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">3 documents/month</p>
                      </div>
                      <p className="font-semibold">$0</p>
                    </label>

                    {/* Basic Plan */}
                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                        profile?.subscription_tier === 'basic'
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : selectedPlan === 'basic'
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value="basic"
                        checked={selectedPlan === 'basic'}
                        onChange={() => setSelectedPlan('basic')}
                        disabled={profile?.subscription_tier === 'basic'}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Basic</p>
                          {profile?.subscription_tier === 'basic' && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Current Plan</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Unlimited documents, 1 property</p>
                      </div>
                      <p className="font-semibold">$19/mo</p>
                    </label>

                    {/* Pro Plan */}
                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                        profile?.subscription_tier === 'pro'
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : selectedPlan === 'pro'
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value="pro"
                        checked={selectedPlan === 'pro'}
                        onChange={() => setSelectedPlan('pro')}
                        disabled={profile?.subscription_tier === 'pro'}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Pro</p>
                          {profile?.subscription_tier === 'pro' && (
                            <span className="text-xs bg-gradient-to-r from-cyan-500 to-indigo-500 text-white px-2 py-0.5 rounded-full">Current Plan</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Unlimited everything, multi-property</p>
                      </div>
                      <p className="font-semibold">$39/mo</p>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePlanNext}
                      disabled={!selectedPlan || selectedPlan === profile?.subscription_tier}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              {/* Step 1: What you're losing */}
              {planModalStep === 1 && (
                <div>
                  <h3 className="font-semibold mb-4">What you&apos;ll lose by downgrading:</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <FiX className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700">Multi-property support</p>
                        <p className="text-sm text-red-600">Basic plan only supports 1 property</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <FiX className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700">Tenant profiles & history</p>
                        <p className="text-sm text-red-600">Only tenants linked to your selected property will remain</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <FiX className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700">Priority support</p>
                        <p className="text-sm text-red-600">You&apos;ll move to standard support queue</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg mb-6">
                    <h4 className="font-medium text-blue-700 mb-2">What you&apos;ll keep:</h4>
                    <ul className="text-sm text-blue-600 space-y-1">
                      <li>• Unlimited documents</li>
                      <li>• All document types</li>
                      <li>• Custom branding</li>
                      <li>• Legal AI Assistant</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Keep Pro Plan
                    </button>
                    <button
                      onClick={() => setPlanModalStep(properties.length > 1 ? 2 : tenants.length > 0 ? 3 : 4)}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Select Property to Keep */}
              {planModalStep === 2 && properties.length > 1 && (
                <div>
                  <h3 className="font-semibold mb-2">Select the property you want to keep:</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Basic plan only supports 1 property. The other {properties.length - 1} propert{properties.length - 1 > 1 ? 'ies' : 'y'} will be deleted.
                  </p>

                  <div className="space-y-2 mb-6">
                    {properties.map(property => (
                      <label
                        key={property.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedProperty === property.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="property"
                          value={property.id}
                          checked={selectedProperty === property.id}
                          onChange={() => setSelectedProperty(property.id)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <FiHome className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{property.address_line1}</p>
                          <p className="text-sm text-muted-foreground">{property.city}, {property.state}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedProperty && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                      <p className="font-medium text-red-700 mb-2">Properties that will be deleted:</p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {getPropertiesToDelete().map(p => (
                          <li key={p.id}>• {p.address_line1}, {p.city}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPlanModalStep(1)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setPlanModalStep(tenants.length > 0 ? 3 : 4)}
                      disabled={!selectedProperty}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Tenant Summary */}
              {planModalStep === 3 && tenants.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tenant Summary</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review which tenants will be kept and which will be removed from your account.
                  </p>

                  {getTenantsToKeep().length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-700 mb-2">Tenants that will be kept:</p>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <ul className="text-sm text-green-600 space-y-1">
                          {getTenantsToKeep().map(t => (
                            <li key={t.id} className="flex items-center gap-2">
                              <FiCheck className="w-4 h-4" />
                              {t.first_name} {t.last_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {getTenantsToDelete().length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-medium text-red-700 mb-2">Tenants that will be deleted:</p>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <ul className="text-sm text-red-600 space-y-1">
                          {getTenantsToDelete().map(t => (
                            <li key={t.id} className="flex items-center gap-2">
                              <FiX className="w-4 h-4" />
                              {t.first_name} {t.last_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                    <p className="text-sm text-amber-700">
                      <strong>Note:</strong> Documents associated with deleted tenants will remain in your account history but will no longer be linked to a tenant profile.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPlanModalStep(properties.length > 1 ? 2 : 1)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setPlanModalStep(4)}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirm with DELETE */}
              {planModalStep === 4 && (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiAlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Confirm Downgrade</h3>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. Please review the changes below.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg mb-6 text-sm space-y-2">
                    {selectedPropertyData && (
                      <p><strong>Property to keep:</strong> {selectedPropertyData.address_line1}, {selectedPropertyData.city}</p>
                    )}
                    {properties.length > 1 && (
                      <p><strong>Properties to delete:</strong> {getPropertiesToDelete().length}</p>
                    )}
                    {tenants.length > 0 && (
                      <>
                        <p><strong>Tenants to keep:</strong> {getTenantsToKeep().length}</p>
                        <p><strong>Tenants to delete:</strong> {getTenantsToDelete().length}</p>
                      </>
                    )}
                    <p><strong>New plan:</strong> {tierLabels[selectedPlan || 'basic']} ({selectedPlan === 'free' ? '$0/month' : selectedPlan === 'basic' ? '$19/month' : '$39/month'})</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Type DELETE"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPlanModalStep(tenants.length > 0 ? 3 : properties.length > 1 ? 2 : 1)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlanChange}
                      disabled={deleteConfirmation !== 'DELETE' || processingChange}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {processingChange ? 'Processing...' : 'Confirm Downgrade'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Upgrade Confirmation */}
              {planModalStep === 5 && (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiCheck className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Upgrade to {tierLabels[selectedPlan || 'pro']}</h3>
                    <p className="text-sm text-muted-foreground">
                      You&apos;re about to upgrade your plan. Here&apos;s what you&apos;ll get:
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                    {selectedPlan === 'basic' && (
                      <ul className="text-sm text-green-700 space-y-2">
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Unlimited documents</li>
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> All document templates</li>
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Email support</li>
                      </ul>
                    )}
                    {selectedPlan === 'pro' && (
                      <ul className="text-sm text-green-700 space-y-2">
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Unlimited documents</li>
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Multi-property support</li>
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Tenant profiles & history</li>
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Priority support</li>
                        <li className="flex items-center gap-2"><FiCheck className="w-4 h-4" /> Legal AI Assistant</li>
                      </ul>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg mb-6 text-sm">
                    <p><strong>New plan:</strong> {tierLabels[selectedPlan || 'pro']} ({selectedPlan === 'basic' ? '$19/month' : '$39/month'})</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPlanModalStep(0)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlanChange}
                      disabled={processingChange}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      {processingChange ? 'Processing...' : 'Confirm Upgrade'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      <BillingModal
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        subscriptionTier={profile?.subscription_tier || 'free'}
      />

      {/* Delete Account Confirmation - Step 1 */}
      <ConfirmModal
        isOpen={deleteAccountStep === 1}
        onClose={() => setDeleteAccountStep(0)}
        onConfirm={handleFirstDeleteConfirm}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
        confirmText="Continue"
        variant="danger"
      />

      {/* Delete Account Confirmation - Step 2 (Final) */}
      <ConfirmModal
        isOpen={deleteAccountStep === 2}
        onClose={() => setDeleteAccountStep(0)}
        onConfirm={handleFinalDeleteConfirm}
        title="Final Warning"
        message="This is your final warning. All properties, tenants, and documents will be deleted. Continue?"
        confirmText="Delete Everything"
        variant="danger"
      />
    </div>
  );
}

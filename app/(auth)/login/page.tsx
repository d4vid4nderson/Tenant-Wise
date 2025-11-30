'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaApple } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';

function AuthForm() {
  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setSignupError(error.message);
      setSignupLoading(false);
    } else {
      setSignupSuccess(true);
      setSignupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
      setLoginLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setSignupError('');
    setLoginError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setSignupError(error.message);
      setLoginError(error.message);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <div className="text-teal-500 text-4xl mb-3">✓</div>
            <h2 className="text-lg font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              We&apos;ve sent you a confirmation link. Please check your email to complete your signup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 py-8 relative">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-50 p-3 bg-white rounded-lg shadow-lg border border-border hover:bg-gray-50 transition-colors"
        aria-label="Go back"
      >
        <FiArrowLeft className="w-5 h-5 text-gray-700" />
      </button>

      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold" style={{ background: 'linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Tenant Wise
          </Link>
          <p className="text-muted-foreground mt-2">
            {plan ? `Join us - ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` : 'Welcome to Tenant Wise'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left Side - Create Account */}
            <div className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-cyan-50 to-blue-50">
              <h2 className="text-xl font-bold mb-1">New here?</h2>
              <p className="text-sm text-muted-foreground mb-6">Create an account to get started</p>

              {/* Social Signup */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-white border border-border rounded-lg hover:bg-slate-50 transition-colors"
                  title="Sign up with Google"
                >
                  <FcGoogle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('facebook')}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors"
                  title="Sign up with Facebook"
                >
                  <FaFacebook className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  title="Sign up with Apple"
                >
                  <FaApple className="w-5 h-5" />
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-gradient-to-br from-cyan-50 to-blue-50 text-muted-foreground">or with email</span>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-3">
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  required
                />
                <Input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                <Input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Password (min 8 characters)"
                  minLength={8}
                  required
                />

                {signupError && (
                  <p className="text-sm text-destructive">{signupError}</p>
                )}

                <Button type="submit" className="w-full bg-[#0089eb] hover:bg-[#0070c0]" loading={signupLoading}>
                  Create Account
                </Button>
              </form>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center px-0">
              <div className="w-px bg-border h-full"></div>
            </div>
            <div className="lg:hidden flex items-center px-6">
              <div className="flex-1 h-px bg-border"></div>
              <span className="px-4 text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Right Side - Login */}
            <div className="flex-1 p-6 lg:p-8">
              <h2 className="text-xl font-bold mb-1">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

              {/* Social Login */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 border border-border rounded-lg hover:bg-slate-50 transition-colors"
                  title="Sign in with Google"
                >
                  <FcGoogle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('facebook')}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors"
                  title="Sign in with Facebook"
                >
                  <FaFacebook className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  title="Sign in with Apple"
                >
                  <FaApple className="w-5 h-5" />
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-muted-foreground">or with email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  required
                />

                {loginError && (
                  <p className="text-sm text-destructive">{loginError}</p>
                )}

                <Button type="submit" className="w-full" loading={loginLoading}>
                  Sign In
                </Button>
              </form>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}

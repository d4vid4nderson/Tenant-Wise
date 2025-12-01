'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { FiCheck, FiLogOut } from 'react-icons/fi';

export default function SignOutPage() {
  const [status, setStatus] = useState<'signing-out' | 'success' | 'error'>('signing-out');
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error('Sign out error:', error);
          setStatus('error');
          return;
        }

        setStatus('success');
      } catch (err) {
        console.error('Sign out error:', err);
        setStatus('error');
      }
    };

    handleSignOut();
  }, [supabase.auth]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  // Separate effect to handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && status === 'success') {
      router.push('/');
    }
  }, [countdown, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-2"
          >
            <Image src="/favicon.svg" alt="Tenant Wise" width={48} height={48} />
            <span
              className="text-4xl font-bold"
              style={{
                background: 'linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Tenant Wise
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              {status === 'signing-out' ? (
                <FiLogOut className="w-8 h-8 text-white animate-pulse" />
              ) : status === 'success' ? (
                <FiCheck className="w-8 h-8 text-white" />
              ) : (
                <FiLogOut className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {status === 'signing-out' && 'Signing you out...'}
              {status === 'success' && 'Signed out successfully'}
              {status === 'error' && 'Sign out failed'}
            </h1>
          </div>

          {/* Content */}
          <div className="px-6 py-8 text-center">
            {status === 'signing-out' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-600">
                  Please wait while we securely sign you out...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Thank you for using Tenant Wise. You have been securely signed out.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span>Redirecting to home in</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full">
                    {countdown}
                  </span>
                </div>
                <div className="pt-4">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Go to Home Now
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  There was an issue signing you out. Please try again.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setStatus('signing-out');
                      supabase.auth.signOut().then(() => {
                        setStatus('success');
                      }).catch(() => {
                        setStatus('error');
                      });
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Go to Home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Want to sign back in?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}

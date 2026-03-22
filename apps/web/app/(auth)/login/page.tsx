'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ROLE_REDIRECT: Record<string, string> = {
  ADMIN: '/admin',
  INSTRUCTOR: '/instructor',
  TA: '/ta',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      // Fetch the session to determine role for redirect
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = (await sessionRes.json()) as {
        user?: { role?: string };
      };
      const role = sessionData?.user?.role ?? 'TA';
      const destination = ROLE_REDIRECT[role] ?? '/ta';
      router.push(destination);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* NAU Navy Header Bar */}
      <div className="bg-nau-navy py-3 px-6">
        <p className="text-center text-sm text-white/70">
          Northern Arizona University
        </p>
      </div>

      {/* Login Card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo block */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-nau-navy">
              <span className="text-xl font-bold text-nau-gold">NAU</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TA Timesheet Tracker</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
          </div>

          {/* Form */}
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20"
                  placeholder="you@nau.edu"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-nau-navy px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            Contact your department admin if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

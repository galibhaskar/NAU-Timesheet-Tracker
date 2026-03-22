'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function InviteUserForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'INSTRUCTOR' | 'TA'>('TA');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      const body = (await res.json()) as { message?: string; error?: string; expiresAt?: string };

      if (!res.ok) {
        setError(body.error ?? 'Failed to send invitation. Please try again.');
      } else {
        setSuccess(`Invitation sent to ${email}. It expires in 7 days.`);
        setName('');
        setEmail('');
        setRole('TA');
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="invite-name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="invite-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20"
          />
        </div>

        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@nau.edu"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20"
          />
        </div>

        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'INSTRUCTOR' | 'TA')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20"
          >
            <option value="TA">Teaching Assistant</option>
            <option value="INSTRUCTOR">Instructor</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-nau-navy px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
}

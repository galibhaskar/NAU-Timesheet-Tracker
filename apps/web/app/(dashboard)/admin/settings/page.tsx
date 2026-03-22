import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { SettingsForm } from './settings-form';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemSettings {
  idle_timeout_minutes: number;
  proof_retention_days: number;
  screenshot_interval_min: number;
  screenshot_interval_max: number;
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') {
    redirect('/admin');
  }

  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const cookieHeader = headers().get('cookie') ?? '';

  let settings: SystemSettings | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/admin/settings`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!res.ok) {
      fetchError = `Failed to load settings (${res.status})`;
    } else {
      const data = (await res.json()) as { settings: SystemSettings };
      settings = data.settings;
    }
  } catch {
    fetchError = 'Network error loading settings';
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-nau-navy hover:underline">
            ← Admin
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure screenshot capture intervals, idle detection, and retention policies.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          {fetchError}
        </div>
      ) : settings ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SettingsForm currentSettings={settings} />
        </div>
      ) : null}
    </div>
  );
}

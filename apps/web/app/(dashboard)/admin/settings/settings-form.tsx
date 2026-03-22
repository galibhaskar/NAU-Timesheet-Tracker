'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SystemSettings {
  idle_timeout_minutes: number;
  proof_retention_days: number;
  screenshot_interval_min: number;
  screenshot_interval_max: number;
}

interface SettingsFormProps {
  currentSettings: SystemSettings;
}

const FIELD_LABELS: Record<keyof SystemSettings, { label: string; description: string; unit: string }> = {
  idle_timeout_minutes: {
    label: 'Idle Timeout',
    description: 'Minutes of inactivity before a session is paused automatically',
    unit: 'minutes',
  },
  proof_retention_days: {
    label: 'Proof Retention',
    description: 'Days to retain screenshot and photo proof files before automatic purge',
    unit: 'days',
  },
  screenshot_interval_min: {
    label: 'Screenshot Interval (Min)',
    description: 'Minimum minutes between automatic screenshots',
    unit: 'minutes',
  },
  screenshot_interval_max: {
    label: 'Screenshot Interval (Max)',
    description: 'Maximum minutes between automatic screenshots',
    unit: 'minutes',
  },
};

export function SettingsForm({ currentSettings }: SettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SystemSettings>({ ...currentSettings });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: keyof SystemSettings, raw: string) {
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      setValues((prev) => ({ ...prev, [key]: num }));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const body = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setError(body.error ?? 'Failed to save settings');
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(Object.keys(FIELD_LABELS) as Array<keyof SystemSettings>).map((key) => {
          const meta = FIELD_LABELS[key];
          return (
            <div key={key}>
              <label
                htmlFor={`setting-${key}`}
                className="block text-sm font-medium text-gray-900"
              >
                {meta.label}
              </label>
              <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id={`setting-${key}`}
                  type="number"
                  min={1}
                  required
                  value={values[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="block w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-nau-navy focus:outline-none focus:ring-2 focus:ring-nau-navy/20"
                />
                <span className="text-sm text-gray-500">{meta.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-nau-navy px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

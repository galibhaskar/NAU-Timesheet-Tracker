import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') {
    redirect('/admin');
  }

  const page = parseInt(searchParams.page ?? '1', 10) || 1;

  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const cookieHeader = headers().get('cookie') ?? '';

  let auditData: AuditLogResponse | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(
      `${baseUrl}/api/admin/audit-log?page=${page}&limit=25`,
      {
        headers: { cookie: cookieHeader },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      fetchError = `Failed to load audit log (${res.status})`;
    } else {
      auditData = (await res.json()) as AuditLogResponse;
    }
  } catch {
    fetchError = 'Network error loading audit log';
  }

  const entries = auditData?.data ?? [];
  const totalPages = auditData?.totalPages ?? 1;
  const totalCount = auditData?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-nau-navy hover:underline">
            ← Admin
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          {totalCount} total entries &mdash; complete record of all system actions
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          {fetchError}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        No audit log entries found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm:ss a')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-mono font-medium text-gray-700">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className="font-medium">{entry.entityType}</span>
                          {entry.entityId && (
                            <span className="ml-1 font-mono text-xs text-gray-400">
                              {entry.entityId.length > 8
                                ? `${entry.entityId.slice(0, 8)}…`
                                : entry.entityId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {entry.user ? (
                            <div>
                              <p className="font-medium">{entry.user.name}</p>
                              <p className="text-xs text-gray-400">{entry.user.email}</p>
                            </div>
                          ) : (
                            <span className="italic text-gray-400">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {entry.ipAddress ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/audit?page=${page - 1}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50 transition-colors"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/audit?page=${page + 1}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

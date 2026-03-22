'use server';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { BudgetBar } from '@/components/ui/budget-bar';
import { CategoryBadge, ModeBadge, StatusBadge } from '@/components/ui/status-badge';
import { TAWeekActions } from './week-actions';
import { format, addDays } from 'date-fns';

// ─── Types matching the corrected /api/dashboard/ta response ──────────────────

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  year: number;
}

interface Session {
  id: string;
  category: string;
  mode: string;
  status: string;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  activeMinutes: number;
  netHours: number;
}

interface Assignment {
  assignmentId: string;
  maxWeeklyHours: number;
  course: Course;
  thisWeek: {
    weekStart: string;
    weekEnd: string;
    sessions: Session[];
    totalHours: number;
  };
}

interface RecentSubmission {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  totalHours: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  course: { id: string; name: string; code: string };
}

interface TADashboardResponse {
  userId: string;
  assignments: Assignment[];
  recentSubmissions: RecentSubmission[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekLabel(weekStartStr: string): string {
  const weekStart = new Date(weekStartStr);
  const weekEnd = addDays(weekStart, 6);
  return `Week of ${format(weekStart, 'EEE MMM d')} – ${format(weekEnd, 'EEE MMM d, yyyy')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TADashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { role?: string };
  if (user.role !== 'TA') redirect('/instructor');

  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const cookieHeader = headers().get('cookie') ?? '';

  let data: TADashboardResponse | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/dashboard/ta`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!res.ok) fetchError = `Failed to load dashboard (${res.status})`;
    else data = (await res.json()) as TADashboardResponse;
  } catch {
    fetchError = 'Network error — could not reach the server';
  }

  if (fetchError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        {fetchError ?? 'Unknown error'}
      </div>
    );
  }

  const { assignments, recentSubmissions } = data;
  const weekStartStr = assignments[0]?.thisWeek.weekStart ?? new Date().toISOString();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TA Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{getWeekLabel(weekStartStr)}</p>
      </div>

      {/* Course Weekly Summary Cards */}
      {assignments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
          You are not assigned to any courses.
        </div>
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">This Week&apos;s Hours</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a) => (
              <div key={a.assignmentId} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{a.course.code}</p>
                  <h3 className="mt-0.5 text-base font-semibold text-gray-900 leading-tight">{a.course.name}</h3>
                  <p className="text-xs text-gray-400">{a.course.semester} {a.course.year}</p>
                </div>
                <BudgetBar usedHours={a.thisWeek.totalHours} totalHours={a.maxWeeklyHours} />
                <div className="mt-3">
                  <TAWeekActions
                    assignmentId={a.assignmentId}
                    weekStart={a.thisWeek.weekStart}
                    sessionCount={a.thisWeek.sessions.filter((s) => s.status === 'COMPLETED').length}
                    hasActiveSessions={a.thisWeek.sessions.some((s) => s.status === 'ACTIVE' || s.status === 'PAUSED')}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* This Week's Sessions */}
      {assignments.some((a) => a.thisWeek.sessions.length > 0) && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">This Week&apos;s Sessions</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Course', 'Category', 'Mode', 'Hours', 'Status', 'Date', 'Description'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignments.flatMap((a) =>
                    a.thisWeek.sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.course.code}</td>
                        <td className="px-4 py-3"><CategoryBadge category={s.category} /></td>
                        <td className="px-4 py-3"><ModeBadge mode={s.mode} /></td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-900">{s.netHours.toFixed(2)}h</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(s.startedAt), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 max-w-xs truncate text-sm text-gray-500">
                          {s.description ?? <span className="italic text-gray-400">No description</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Recent Submissions</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Course', 'Week', 'Hours', 'Status', 'Notes', 'Export'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{sub.course.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getWeekLabel(sub.weekStart)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-900">{sub.totalHours.toFixed(2)}h</td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-3 max-w-xs truncate text-sm text-gray-500">
                        {sub.rejectionReason ?? <span className="italic text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {sub.status === 'APPROVED' ? (
                          <a href={`/api/export/${sub.id}`} className="text-sm font-medium text-blue-700 underline hover:opacity-80">
                            Download CSV
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

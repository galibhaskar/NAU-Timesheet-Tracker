import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { BudgetBar } from '@/components/ui/budget-bar';
import { format } from 'date-fns';

// ─── Types matching actual API responses ──────────────────────────────────────

interface CourseOverview {
  courseId: string;
  code: string;
  name: string;
  semester: string;
  year: number;
  enrolledStudents: number;
  activeTaCount: number;
  pendingSubmissions: number;
  budget: {
    weeklyBudget: number;
    usedHours: number;
    budgetPercentage: number;
    budgetStatus: string;
  };
}

interface OverspendAlert {
  courseId: string;
  courseCode: string;
  courseName: string;
  usedHours: number;
  weeklyBudget: number;
  overspendHours: number;
  budgetPercentage: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface AdminDashboardResponse {
  weekStart: string;
  weekEnd: string;
  totalCourses: number;
  totalActiveTAs: number;
  totalPendingSubmissions: number;
  overspendAlerts: OverspendAlert[];
  courses: CourseOverview[];
  recentAudit: AuditLogEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(weekStart: string, weekEnd: string): string {
  return `${format(new Date(weekStart), 'MMM d')} – ${format(new Date(weekEnd), 'MMM d, yyyy')}`;
}

function getBudgetStatusClasses(status: string): string {
  if (status === 'red') return 'text-red-700 bg-red-50 border-red-200';
  if (status === 'yellow') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-green-700 bg-green-50 border-green-200';
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') {
    if (user.role === 'INSTRUCTOR') redirect('/instructor');
    redirect('/ta');
  }

  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const cookieHeader = headers().get('cookie') ?? '';

  const dashboardRes = await fetch(`${baseUrl}/api/dashboard/admin`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });

  let dashData: AdminDashboardResponse | null = null;
  let fetchError: string | null = null;

  if (!dashboardRes.ok) fetchError = `Failed to load dashboard (${dashboardRes.status})`;
  else dashData = (await dashboardRes.json()) as AdminDashboardResponse;

  if (fetchError || !dashData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        {fetchError ?? 'Unknown error loading admin dashboard'}
      </div>
    );
  }

  const { courses, totalCourses, totalActiveTAs, totalPendingSubmissions, overspendAlerts, weekStart, weekEnd, recentAudit } = dashData;
  const auditEntries = recentAudit;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Current week: {formatWeekRange(weekStart, weekEnd)}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/users"
            className="rounded-lg bg-nau-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* System Overview Stat Cards */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Active TAs
            </p>
            <p className="mt-2 text-3xl font-bold text-nau-navy">{totalActiveTAs}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Pending Submissions
            </p>
            <p
              className={`mt-2 text-3xl font-bold ${
                totalPendingSubmissions > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}
            >
              {totalPendingSubmissions}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Active Courses
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{totalCourses}</p>
          </div>
        </div>
      </section>

      {/* Overspend Alerts */}
      {overspendAlerts.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Budget Alerts
            <span className="ml-2 rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">
              {overspendAlerts.length}
            </span>
          </h2>
          <div className="space-y-2">
            {overspendAlerts.map((alert) => (
              <div
                key={alert.courseId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-red-800">{alert.courseCode} — {alert.courseName}</span>
                  <span className="ml-2 text-sm text-red-600">
                    {alert.usedHours.toFixed(1)}h used / {alert.weeklyBudget.toFixed(1)}h budget
                    (+{alert.overspendHours.toFixed(1)}h over)
                  </span>
                </div>
                <span className="text-sm font-semibold text-red-700">
                  {alert.budgetPercentage}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Course Health Grid */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Course Health — This Week</h2>
        {courses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            No active courses found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      TAs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Pending
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-[200px]">
                      Weekly Budget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map((course) => (
                    <tr key={course.courseId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{course.code}</p>
                        <p className="text-xs text-gray-500">{course.name}</p>
                        <p className="text-xs text-gray-400">{course.semester} {course.year}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{course.activeTaCount}</td>
                      <td className="px-4 py-3 text-sm">
                        {course.pendingSubmissions > 0 ? (
                          <span className="font-semibold text-yellow-700">
                            {course.pendingSubmissions}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BudgetBar
                          usedHours={course.budget.usedHours}
                          totalHours={course.budget.weeklyBudget}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBudgetStatusClasses(
                            course.budget.budgetStatus
                          )}`}
                        >
                          {course.budget.budgetStatus === 'green'
                            ? 'On Track'
                            : course.budget.budgetStatus === 'yellow'
                            ? 'Near Limit'
                            : 'Over Budget'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Recent Audit Log */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Audit Log</h2>
          <Link
            href="/admin/audit"
            className="text-sm font-medium text-nau-navy hover:underline"
          >
            View all →
          </Link>
        </div>

        {auditEntries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
            No audit log entries yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
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
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-mono font-medium text-gray-700">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="font-medium">{entry.entityType}</span>
                        {entry.entityId && (
                          <span className="ml-1 font-mono text-xs text-gray-400">
                            {entry.entityId.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.user ? (
                          <span className="text-gray-900">{entry.user.name}</span>
                        ) : (
                          <span className="italic text-gray-400">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { BudgetBar } from '@/components/ui/budget-bar';
import { InstructorActions } from './instructor-actions';
import { format, addDays } from 'date-fns';

// ─── Types matching actual API responses ──────────────────────────────────────

interface CourseData {
  courseId: string;
  code: string;
  name: string;
  semester: string;
  year: number;
  enrolledStudents: number;
  pendingSubmissions: number;
  budget: {
    weeklyBudget: number;
    usedHours: number;
    budgetPercentage: number;
    budgetStatus: string;
  };
}

interface PendingSubmission {
  id: string;
  taName: string;
  taEmail: string;
  taId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  totalScreenshots: number;
  status: string;
  submittedAt: string | null;
}

// ─── Week label helper ─────────────────────────────────────────────────────────

function getWeekLabel(weekStartStr: string): string {
  const weekStart = new Date(weekStartStr);
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function InstructorDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { role?: string };
  if (user.role !== 'INSTRUCTOR') {
    if (user.role === 'ADMIN') redirect('/admin');
    redirect('/ta');
  }

  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const cookieHeader = headers().get('cookie') ?? '';

  // Parallel fetch: course budgets + pending submissions list
  const [coursesRes, pendingRes] = await Promise.all([
    fetch(`${baseUrl}/api/dashboard/instructor`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
    fetch(`${baseUrl}/api/dashboard/instructor/submissions`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    }),
  ]);

  let courses: CourseData[] = [];
  let pendingSubmissions: PendingSubmission[] = [];
  let fetchError: string | null = null;

  if (!coursesRes.ok || !pendingRes.ok) {
    fetchError = `Failed to load dashboard (courses: ${coursesRes.status}, pending: ${pendingRes.status})`;
  } else {
    const coursesData = (await coursesRes.json()) as { courses: CourseData[] };
    const pendingData = (await pendingRes.json()) as { pendingSubmissions: PendingSubmission[] };
    courses = coursesData.courses ?? [];
    pendingSubmissions = pendingData.pendingSubmissions ?? [];
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        {fetchError}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pendingSubmissions.length > 0
              ? `${pendingSubmissions.length} submission${pendingSubmissions.length !== 1 ? 's' : ''} awaiting review`
              : 'No pending submissions'}
          </p>
        </div>
      </div>

      {/* Pending Submissions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Pending Review
          {pendingSubmissions.length > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2.5 py-0.5 text-sm font-medium text-yellow-800">
              {pendingSubmissions.length}
            </span>
          )}
        </h2>

        {pendingSubmissions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            All caught up — no submissions awaiting review.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Submission info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{sub.taName}</span>
                      <span className="text-xs text-gray-400">{sub.taEmail}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>
                        <span className="font-medium">{sub.courseCode}</span>{' '}
                        <span className="text-gray-400">—</span> {sub.courseName}
                      </span>
                      <span>Week: {getWeekLabel(sub.weekStart)}</span>
                      <span className="font-mono font-medium">{sub.totalHours.toFixed(2)}h</span>
                      <span className="text-gray-500">
                        {sub.totalScreenshots} screenshot{sub.totalScreenshots !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Link to screenshot gallery */}
                    <div className="mt-2">
                      <a
                        href={`/instructor/submissions/${sub.id}/screenshots`}
                        className="text-xs font-medium text-nau-navy underline hover:opacity-80"
                      >
                        View screenshots →
                      </a>
                    </div>
                  </div>

                  {/* Approve / Reject buttons — client component */}
                  <InstructorActions submissionId={sub.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Course Budget Overview */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Course Budgets — This Week</h2>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
            You are not assigned to any active courses.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.courseId}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {course.code}
                  </p>
                  <h3 className="mt-0.5 text-base font-semibold text-gray-900 leading-tight">
                    {course.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {course.semester} {course.year} &middot; {course.enrolledStudents} students
                  </p>
                </div>

                <BudgetBar
                  usedHours={course.budget.usedHours}
                  totalHours={course.budget.weeklyBudget}
                />

                {course.pendingSubmissions > 0 && (
                  <p className="mt-2 text-xs text-yellow-700">
                    {course.pendingSubmissions} pending submission
                    {course.pendingSubmissions !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

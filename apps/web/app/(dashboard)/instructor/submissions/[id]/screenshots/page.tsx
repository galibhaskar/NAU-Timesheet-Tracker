import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { CategoryBadge, ModeBadge } from '@/components/ui/status-badge';
import { ScreenshotLightbox } from './screenshot-lightbox';
import { format, addDays } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScreenshotData {
  id: string;
  capturedAt: string;
  minuteMark: number;
  fileSize: number;
  url: string;
  thumbnailUrl: string;
}

interface SessionWithScreenshots {
  sessionId: string;
  category: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  netHours: number;
  screenshots: ScreenshotData[];
}

interface SubmissionScreenshotsResponse {
  submissionId: string;
  taName: string;
  courseCode: string;
  courseName: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  sessions: SessionWithScreenshots[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScreenshotsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { role?: string };
  if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
    redirect('/ta');
  }

  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const cookieHeader = headers().get('cookie') ?? '';

  let data: SubmissionScreenshotsResponse | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/submissions/${params.id}/screenshots`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!res.ok) {
      fetchError = `Failed to load screenshots (${res.status})`;
    } else {
      data = (await res.json()) as SubmissionScreenshotsResponse;
    }
  } catch {
    fetchError = 'Network error — could not reach the server';
  }

  if (fetchError || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1 text-sm text-nau-navy hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          {fetchError ?? 'Unknown error'}
        </div>
      </div>
    );
  }

  const weekStart = new Date(data.weekStart);
  const weekEnd = addDays(weekStart, 6);
  const totalScreenshots = data.sessions.reduce((sum, s) => sum + s.screenshots.length, 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/instructor"
        className="inline-flex items-center gap-1 text-sm text-nau-navy hover:underline"
      >
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Screenshot Gallery</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>
            <span className="font-medium text-gray-700">{data.taName}</span>
          </span>
          <span>
            <span className="font-medium">{data.courseCode}</span> — {data.courseName}
          </span>
          <span>
            Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <span>{totalScreenshots} screenshot{totalScreenshots !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Sessions with screenshots */}
      {data.sessions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No sessions found for this submission.
        </div>
      ) : (
        <div className="space-y-8">
          {data.sessions.map((sess) => (
            <div key={sess.sessionId}>
              {/* Session header */}
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <CategoryBadge category={sess.category} />
                <ModeBadge mode={sess.mode} />
                <span className="text-sm text-gray-500">
                  {format(new Date(sess.startedAt), 'EEE MMM d, h:mm a')}
                  {sess.endedAt ? ` → ${format(new Date(sess.endedAt), 'h:mm a')}` : ''}
                </span>
                <span className="font-mono text-sm font-medium text-gray-700">
                  {sess.netHours.toFixed(2)}h
                </span>
              </div>

              {sess.screenshots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
                  No screenshots for this session
                </p>
              ) : (
                <ScreenshotLightbox screenshots={sess.screenshots} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

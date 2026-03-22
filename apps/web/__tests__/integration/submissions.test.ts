/**
 * Submission state machine integration tests.
 *
 * Tests the full DRAFT→SUBMITTED→APPROVED/REJECTED lifecycle against a real
 * PostgreSQL database. Each test creates its own isolated data via beforeEach.
 *
 * Run with: npm run test:integration
 */

import { testPrisma, resetDb, createTestUser, createTestCourse, createTestAssignment } from '../setup/db';
import { signToken, makeReq } from '../setup/request-helpers';
import { POST as startSession } from '@/app/api/sessions/route';
import { POST as stopSession } from '@/app/api/sessions/[id]/stop/route';
import { POST as submitWeek } from '@/app/api/submissions/submit/route';
import { POST as approveSubmission } from '@/app/api/submissions/[id]/approve/route';
import { POST as rejectSubmission } from '@/app/api/submissions/[id]/reject/route';

// ─── Shared test data ────────────────────────────────────────────────────────

let taUser: Awaited<ReturnType<typeof createTestUser>>;
let instructorUser: Awaited<ReturnType<typeof createTestUser>>;
let assignment: Awaited<ReturnType<typeof createTestAssignment>>;
let taToken: string;
let instructorToken: string;

// Monday 2026-03-16 in Phoenix — route interprets YYYY-MM-DD as Phoenix midnight
const WEEK_START = '2026-03-16';

beforeEach(async () => {
  await resetDb();

  taUser = await createTestUser({ email: 'ta@nau.edu', role: 'TA' });
  instructorUser = await createTestUser({ email: 'instructor@nau.edu', role: 'INSTRUCTOR' });
  const course = await createTestCourse();
  assignment = await createTestAssignment(taUser.id, course.id, 'TA');
  await createTestAssignment(instructorUser.id, course.id, 'INSTRUCTOR');

  taToken = signToken({ id: taUser.id, email: taUser.email, role: 'TA' });
  instructorToken = signToken({
    id: instructorUser.id,
    email: instructorUser.email,
    role: 'INSTRUCTOR',
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Start and immediately stop a session in the target week, returning the session. */
async function createCompletedSession(startedAt: Date) {
  // Directly insert a COMPLETED session so tests don't depend on exact timing
  const session = await testPrisma.workSession.create({
    data: {
      assignmentId: assignment.id,
      category: 'GRADING',
      mode: 'SCREEN',
      status: 'COMPLETED',
      startedAt,
      endedAt: new Date(startedAt.getTime() + 60 * 60 * 1000), // +1 hour
      activeMinutes: 60,
      idleMinutes: 0,
      netHours: 1.0,
    },
  });
  // Required events for completeness
  await testPrisma.sessionEvent.createMany({
    data: [
      { sessionId: session.id, eventType: 'STARTED', serverTimestamp: startedAt },
      {
        sessionId: session.id,
        eventType: 'STOPPED',
        serverTimestamp: new Date(startedAt.getTime() + 60 * 60 * 1000),
      },
    ],
  });
  return session;
}

// ─── Submit ───────────────────────────────────────────────────────────────────

describe('POST /api/submissions/submit', () => {
  it('creates a SUBMITTED submission and links completed sessions', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z')); // within the week

    const res = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    expect(res.status).toBe(201);

    const { submission } = await res.json();
    expect(submission.status).toBe('SUBMITTED');
    expect(Number(submission.totalHours)).toBe(1);

    // Sessions should be linked to the submission
    const linked = await testPrisma.workSession.findMany({
      where: { submissionId: submission.id },
    });
    expect(linked).toHaveLength(1);
  });

  it('returns 422 when an ACTIVE session exists for the week', async () => {
    // Create an active (not stopped) session
    await testPrisma.workSession.create({
      data: {
        assignmentId: assignment.id,
        category: 'GRADING',
        mode: 'SCREEN',
        status: 'ACTIVE',
        startedAt: new Date('2026-03-17T09:00:00.000Z'),
        activeMinutes: 0,
        idleMinutes: 0,
        netHours: 0,
      },
    });

    const res = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('UNPROCESSABLE');
    expect(body.details.inProgressSessionIds).toHaveLength(1);
  });

  it('returns 409 when the week is already submitted', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z'));

    const req = () =>
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      });

    await submitWeek(req()); // first submit
    const res = await submitWeek(req()); // second submit
    expect(res.status).toBe(409);
  });
});

// ─── Approve ─────────────────────────────────────────────────────────────────

describe('POST /api/submissions/:id/approve', () => {
  it('transitions SUBMITTED → APPROVED and sets reviewerId', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z'));
    const submitRes = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    const { submission } = await submitRes.json();
    const id: string = submission.id;

    const approveRes = await approveSubmission(
      makeReq('POST', `/api/submissions/${id}/approve`, { token: instructorToken }),
      { params: { id } }
    );
    expect(approveRes.status).toBe(200);

    const { submission: approved } = await approveRes.json();
    expect(approved.status).toBe('APPROVED');
    expect(approved.reviewerId).toBe(instructorUser.id);
  });

  it('returns 403 when an unrelated instructor tries to approve', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z'));
    const submitRes = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    const { submission } = await submitRes.json();
    const id: string = submission.id;

    // A different instructor not assigned to this course
    const stranger = await createTestUser({ email: 'stranger@nau.edu', role: 'INSTRUCTOR' });
    const strangerToken = signToken({ id: stranger.id, email: stranger.email, role: 'INSTRUCTOR' });

    const res = await approveSubmission(
      makeReq('POST', `/api/submissions/${id}/approve`, { token: strangerToken }),
      { params: { id } }
    );
    expect(res.status).toBe(403);
  });

  it('returns 409 when trying to approve an already-approved submission', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z'));
    const submitRes = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    const { submission } = await submitRes.json();
    const id: string = submission.id;

    const approveReq = () =>
      makeReq('POST', `/api/submissions/${id}/approve`, { token: instructorToken });
    await approveSubmission(approveReq(), { params: { id } });
    const res = await approveSubmission(approveReq(), { params: { id } });
    expect(res.status).toBe(409);
  });
});

// ─── Reject ───────────────────────────────────────────────────────────────────

describe('POST /api/submissions/:id/reject', () => {
  it('transitions SUBMITTED → REJECTED and stores rejection reason', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z'));
    const submitRes = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    const { submission } = await submitRes.json();
    const id: string = submission.id;

    const rejectRes = await rejectSubmission(
      makeReq('POST', `/api/submissions/${id}/reject`, {
        body: { reason: 'Missing screenshots for Tuesday session' },
        token: instructorToken,
      }),
      { params: { id } }
    );
    expect(rejectRes.status).toBe(200);

    const { submission: rejected } = await rejectRes.json();
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Missing screenshots for Tuesday session');

    // Rejection reason should also appear in AuditLog
    const log = await testPrisma.auditLog.findFirst({
      where: { entityId: id, action: 'REJECTED' },
    });
    expect(log).not.toBeNull();
    expect((log!.details as Record<string, unknown>).reason).toBe(
      'Missing screenshots for Tuesday session'
    );
  });

  it('allows resubmission after rejection (REJECTED → SUBMITTED)', async () => {
    await createCompletedSession(new Date('2026-03-17T09:00:00.000Z'));

    // Submit
    const submitRes = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    const { submission } = await submitRes.json();
    const id: string = submission.id;

    // Reject
    await rejectSubmission(
      makeReq('POST', `/api/submissions/${id}/reject`, {
        body: { reason: 'Needs more screenshots' },
        token: instructorToken,
      }),
      { params: { id } }
    );

    // Create another completed session and resubmit
    await createCompletedSession(new Date('2026-03-18T09:00:00.000Z'));
    const resubmitRes = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    expect(resubmitRes.status).toBe(201);
    const { submission: resubmitted } = await resubmitRes.json();
    expect(resubmitted.status).toBe('SUBMITTED');
    expect(resubmitted.id).toBe(id); // same submission record, status updated
  });

  it('enforces maximum 3 rejection cycles', async () => {
    // Cycle through 3 reject → resubmit rounds
    for (let cycle = 0; cycle < 3; cycle++) {
      // Create a new completed session each cycle
      await createCompletedSession(
        new Date(`2026-03-1${7 + cycle}T09:00:00.000Z`)
      );

      const submitRes = await submitWeek(
        makeReq('POST', '/api/submissions/submit', {
          body: { assignmentId: assignment.id, weekStart: WEEK_START },
          token: taToken,
        })
      );
      const { submission } = await submitRes.json();
      const id: string = submission.id;

      await rejectSubmission(
        makeReq('POST', `/api/submissions/${id}/reject`, {
          body: { reason: `Rejection ${cycle + 1}` },
          token: instructorToken,
        }),
        { params: { id } }
      );
    }

    // 4th submit attempt should fail
    await createCompletedSession(new Date('2026-03-20T09:00:00.000Z'));
    const res = await submitWeek(
      makeReq('POST', '/api/submissions/submit', {
        body: { assignmentId: assignment.id, weekStart: WEEK_START },
        token: taToken,
      })
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/Maximum 3 resubmissions/);
  });
});

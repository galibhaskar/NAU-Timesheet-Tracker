/**
 * Session lifecycle integration tests.
 *
 * These tests call the actual Next.js route handlers against a real
 * PostgreSQL database. Each test suite resets the DB in beforeEach so
 * tests are isolated from each other.
 *
 * Auth: uses Bearer JWT (Electron path in getAuthContext) to avoid
 * needing a running NextAuth server.
 *
 * Run with: npm run test:integration
 */

import { testPrisma, resetDb, createTestUser, createTestCourse, createTestAssignment } from '../setup/db';
import { signToken, makeReq } from '../setup/request-helpers';
import { POST as startSession } from '@/app/api/sessions/route';
import { POST as pauseSession } from '@/app/api/sessions/[id]/pause/route';
import { POST as resumeSession } from '@/app/api/sessions/[id]/resume/route';
import { POST as stopSession } from '@/app/api/sessions/[id]/stop/route';

// ─── Test data ──────────────────────────────────────────────────────────────

let taUser: Awaited<ReturnType<typeof createTestUser>>;
let taToken: string;
let assignment: Awaited<ReturnType<typeof createTestAssignment>>;

beforeEach(async () => {
  await resetDb();

  taUser = await createTestUser({ email: 'ta@nau.edu', role: 'TA' });
  const course = await createTestCourse();
  assignment = await createTestAssignment(taUser.id, course.id, 'TA');
  taToken = signToken({ id: taUser.id, email: taUser.email, role: 'TA' });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ─── Start session ──────────────────────────────────────────────────────────

describe('POST /api/sessions (start)', () => {
  it('creates a session and STARTED event', async () => {
    const req = makeReq('POST', '/api/sessions', {
      body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
      token: taToken,
    });
    const res = await startSession(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.session.status).toBe('ACTIVE');
    expect(body.session.assignmentId).toBe(assignment.id);

    // Verify STARTED event was persisted
    const events = await testPrisma.sessionEvent.findMany({
      where: { sessionId: body.session.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('STARTED');
  });

  it('returns 409 when TA already has an active session', async () => {
    // Start first session
    const req1 = makeReq('POST', '/api/sessions', {
      body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
      token: taToken,
    });
    await startSession(req1);

    // Attempt second session
    const req2 = makeReq('POST', '/api/sessions', {
      body: { assignmentId: assignment.id, category: 'OFFICE_HOURS', mode: 'IN_PERSON' },
      token: taToken,
    });
    const res2 = await startSession(req2);
    expect(res2.status).toBe(409);

    const body = await res2.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.details).toHaveProperty('activeSessionId');
  });

  it('returns 403 when TA tries to start a session for another user\'s assignment', async () => {
    const otherUser = await createTestUser({ email: 'other@nau.edu', role: 'TA' });
    const course2 = await createTestCourse({ code: 'CS345' });
    const otherAssignment = await createTestAssignment(otherUser.id, course2.id, 'TA');

    const req = makeReq('POST', '/api/sessions', {
      body: { assignmentId: otherAssignment.id, category: 'GRADING', mode: 'SCREEN' },
      token: taToken,
    });
    const res = await startSession(req);
    expect(res.status).toBe(403);
  });

  it('returns 401 when no auth token provided', async () => {
    const req = makeReq('POST', '/api/sessions', {
      body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
    });
    const res = await startSession(req);
    expect(res.status).toBe(401);
  });
});

// ─── Full lifecycle: start → pause → resume → stop ──────────────────────────

describe('Session lifecycle (start → pause → resume → stop)', () => {
  it('correctly computes activeMinutes from server-authoritative events', async () => {
    // 1. Start
    const startReq = makeReq('POST', '/api/sessions', {
      body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
      token: taToken,
    });
    const startRes = await startSession(startReq);
    expect(startRes.status).toBe(201);
    const { session } = await startRes.json();
    const sessionId = session.id;

    // Manually backdate the STARTED event by 30 minutes so calculations are deterministic
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    await testPrisma.sessionEvent.updateMany({
      where: { sessionId, eventType: 'STARTED' },
      data: { serverTimestamp: thirtyMinAgo },
    });
    await testPrisma.workSession.update({
      where: { id: sessionId },
      data: { startedAt: thirtyMinAgo },
    });

    // 2. Stop (server records STOPPED event now — ~30 min after STARTED)
    const stopReq = makeReq('POST', `/api/sessions/${sessionId}/stop`, {
      body: { description: 'Graded midterms' },
      token: taToken,
    });
    const stopRes = await stopSession(stopReq, { params: { id: sessionId } });
    expect(stopRes.status).toBe(200);

    const { session: stopped } = await stopRes.json();
    expect(stopped.status).toBe('COMPLETED');
    // activeMinutes should be close to 30 (within 1 min tolerance for execution time)
    expect(stopped.activeMinutes).toBeGreaterThanOrEqual(29);
    expect(stopped.activeMinutes).toBeLessThanOrEqual(31);
    expect(Number(stopped.netHours)).toBeCloseTo(0.5, 1);
  });

  it('pause sets status to PAUSED and resume sets it back to ACTIVE', async () => {
    // Start
    const startRes = await startSession(
      makeReq('POST', '/api/sessions', {
        body: { assignmentId: assignment.id, category: 'OFFICE_HOURS', mode: 'SCREEN' },
        token: taToken,
      })
    );
    const { session } = await startRes.json();
    const id = session.id;

    // Pause
    const pauseRes = await pauseSession(
      makeReq('POST', `/api/sessions/${id}/pause`, { token: taToken }),
      { params: { id } }
    );
    expect(pauseRes.status).toBe(200);
    expect((await pauseRes.json()).session.status).toBe('PAUSED');

    // Resume
    const resumeRes = await resumeSession(
      makeReq('POST', `/api/sessions/${id}/resume`, { token: taToken }),
      { params: { id } }
    );
    expect(resumeRes.status).toBe(200);
    expect((await resumeRes.json()).session.status).toBe('ACTIVE');

    // Verify 3 events in DB: STARTED, PAUSED, RESUMED
    const events = await testPrisma.sessionEvent.findMany({
      where: { sessionId: id },
      orderBy: { serverTimestamp: 'asc' },
    });
    expect(events.map((e) => e.eventType)).toEqual(['STARTED', 'PAUSED', 'RESUMED']);
  });

  it('cannot pause an already-paused session', async () => {
    const startRes = await startSession(
      makeReq('POST', '/api/sessions', {
        body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
        token: taToken,
      })
    );
    const { session } = await startRes.json();
    const id = session.id;

    await pauseSession(
      makeReq('POST', `/api/sessions/${id}/pause`, { token: taToken }),
      { params: { id } }
    );

    // Second pause should fail
    const res = await pauseSession(
      makeReq('POST', `/api/sessions/${id}/pause`, { token: taToken }),
      { params: { id } }
    );
    expect(res.status).toBe(409);
  });

  it('stop on a paused session still computes active minutes correctly', async () => {
    const startRes = await startSession(
      makeReq('POST', '/api/sessions', {
        body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
        token: taToken,
      })
    );
    const { session } = await startRes.json();
    const id = session.id;

    // Backdate STARTED to 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await testPrisma.sessionEvent.updateMany({
      where: { sessionId: id, eventType: 'STARTED' },
      data: { serverTimestamp: oneHourAgo },
    });
    await testPrisma.workSession.update({ where: { id }, data: { startedAt: oneHourAgo } });

    // Pause (now = 30 min ago → 30 min active)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    await pauseSession(
      makeReq('POST', `/api/sessions/${id}/pause`, { token: taToken }),
      { params: { id } }
    );
    // Override the PAUSED timestamp to 30 min ago
    await testPrisma.sessionEvent.updateMany({
      where: { sessionId: id, eventType: 'PAUSED' },
      data: { serverTimestamp: thirtyMinAgo },
    });

    // Stop now (session was paused for 30 min — no extra active time)
    const stopRes = await stopSession(
      makeReq('POST', `/api/sessions/${id}/stop`, { body: { description: 'Graded assignments' }, token: taToken }),
      { params: { id } }
    );
    expect(stopRes.status).toBe(200);
    const { session: stopped } = await stopRes.json();
    expect(stopped.status).toBe('COMPLETED');
    // Only the 30 active minutes (before the pause) should count
    expect(stopped.activeMinutes).toBeGreaterThanOrEqual(29);
    expect(stopped.activeMinutes).toBeLessThanOrEqual(31);
  });

  it('creates an AuditLog entry for session stop', async () => {
    const startRes = await startSession(
      makeReq('POST', '/api/sessions', {
        body: { assignmentId: assignment.id, category: 'GRADING', mode: 'SCREEN' },
        token: taToken,
      })
    );
    const { session } = await startRes.json();
    const id = session.id;

    await stopSession(
      makeReq('POST', `/api/sessions/${id}/stop`, { body: { description: 'Graded exams' }, token: taToken }),
      { params: { id } }
    );

    const logs = await testPrisma.auditLog.findMany({
      where: { entityId: id, action: 'SESSION_STOPPED' },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe(taUser.id);
  });
});

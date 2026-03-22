/**
 * Demo seed — creates a realistic dataset for the NAU Timesheet Tracker demo.
 *
 * Accounts (all passwords: password123):
 *   admin@nau.edu       — ADMIN
 *   instructor1@nau.edu — Dr. Smith  (teaches CS249)
 *   instructor2@nau.edu — Dr. Jones  (teaches CS345)
 *   ta1@nau.edu         — TA One    (CS249, 3 sessions this week, 1 pending submission)
 *   ta2@nau.edu         — TA Two    (CS249, approved submission from last week)
 *   ta3@nau.edu         — TA Three  (CS345, rejected submission, resubmitted)
 *   ta4@nau.edu         — TA Four   (CS345, no activity yet)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Monday 2026-03-16 00:00 Phoenix (UTC-7) = 2026-03-16T07:00:00.000Z
const THIS_WEEK_START = new Date('2026-03-16T07:00:00.000Z');
const THIS_WEEK_END   = new Date('2026-03-23T06:59:59.999Z');

// Previous week
const LAST_WEEK_START = new Date('2026-03-09T07:00:00.000Z');
const LAST_WEEK_END   = new Date('2026-03-16T06:59:59.999Z');

function hrs(n: number) {
  return new Prisma.Decimal(n);
}

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  // ─── Users ─────────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nau.edu' },
    update: {},
    create: { email: 'admin@nau.edu', name: 'Admin User', password: hash, role: 'ADMIN' },
  });

  const inst1 = await prisma.user.upsert({
    where: { email: 'instructor1@nau.edu' },
    update: {},
    create: { email: 'instructor1@nau.edu', name: 'Dr. Smith', password: hash, role: 'INSTRUCTOR' },
  });

  const inst2 = await prisma.user.upsert({
    where: { email: 'instructor2@nau.edu' },
    update: {},
    create: { email: 'instructor2@nau.edu', name: 'Dr. Jones', password: hash, role: 'INSTRUCTOR' },
  });

  const ta1 = await prisma.user.upsert({
    where: { email: 'ta1@nau.edu' },
    update: {},
    create: { email: 'ta1@nau.edu', name: 'Alex Rivera', password: hash, role: 'TA' },
  });

  const ta2 = await prisma.user.upsert({
    where: { email: 'ta2@nau.edu' },
    update: {},
    create: { email: 'ta2@nau.edu', name: 'Jordan Lee', password: hash, role: 'TA' },
  });

  const ta3 = await prisma.user.upsert({
    where: { email: 'ta3@nau.edu' },
    update: {},
    create: { email: 'ta3@nau.edu', name: 'Morgan Chen', password: hash, role: 'TA' },
  });

  const ta4 = await prisma.user.upsert({
    where: { email: 'ta4@nau.edu' },
    update: {},
    create: { email: 'ta4@nau.edu', name: 'Sam Patel', password: hash, role: 'TA' },
  });

  // ─── Courses ───────────────────────────────────────────────────────────────

  const cs249 =
    (await prisma.course.findFirst({ where: { code: 'CS249', semester: 'SPRING', year: 2026 } })) ??
    (await prisma.course.create({
      data: {
        name: 'Data Structures',
        code: 'CS249',
        semester: 'SPRING',
        year: 2026,
        enrolledStudents: 120,
        hoursPerStudent: new Prisma.Decimal('0.15'),
      },
    }));

  const cs345 =
    (await prisma.course.findFirst({ where: { code: 'CS345', semester: 'SPRING', year: 2026 } })) ??
    (await prisma.course.create({
      data: {
        name: 'Database Systems',
        code: 'CS345',
        semester: 'SPRING',
        year: 2026,
        enrolledStudents: 80,
        hoursPerStudent: new Prisma.Decimal('0.20'),
      },
    }));

  // ─── Assignments ───────────────────────────────────────────────────────────

  const aInst1 = await prisma.courseAssignment.upsert({
    where: { userId_courseId: { userId: inst1.id, courseId: cs249.id } },
    update: {},
    create: { userId: inst1.id, courseId: cs249.id, role: 'INSTRUCTOR' },
  });

  const aInst2 = await prisma.courseAssignment.upsert({
    where: { userId_courseId: { userId: inst2.id, courseId: cs345.id } },
    update: {},
    create: { userId: inst2.id, courseId: cs345.id, role: 'INSTRUCTOR' },
  });

  const aTa1 = await prisma.courseAssignment.upsert({
    where: { userId_courseId: { userId: ta1.id, courseId: cs249.id } },
    update: {},
    create: { userId: ta1.id, courseId: cs249.id, role: 'TA', maxWeeklyHours: new Prisma.Decimal(20) },
  });

  const aTa2 = await prisma.courseAssignment.upsert({
    where: { userId_courseId: { userId: ta2.id, courseId: cs249.id } },
    update: {},
    create: { userId: ta2.id, courseId: cs249.id, role: 'TA', maxWeeklyHours: new Prisma.Decimal(20) },
  });

  const aTa3 = await prisma.courseAssignment.upsert({
    where: { userId_courseId: { userId: ta3.id, courseId: cs345.id } },
    update: {},
    create: { userId: ta3.id, courseId: cs345.id, role: 'TA', maxWeeklyHours: new Prisma.Decimal(15) },
  });

  const aTa4 = await prisma.courseAssignment.upsert({
    where: { userId_courseId: { userId: ta4.id, courseId: cs345.id } },
    update: {},
    create: { userId: ta4.id, courseId: cs345.id, role: 'TA', maxWeeklyHours: new Prisma.Decimal(15) },
  });

  // ─── System Settings (key-value store) ────────────────────────────────────

  const settingEntries: Array<{ key: string; value: string }> = [
    { key: 'idle_timeout_minutes',   value: '15' },
    { key: 'proof_retention_days',   value: '90' },
    { key: 'screenshot_interval_min', value: '5' },
    { key: 'screenshot_interval_max', value: '10' },
  ];
  for (const entry of settingEntries) {
    await prisma.systemSettings.upsert({
      where: { key: entry.key },
      update: {},
      create: { key: entry.key, value: entry.value, updatedBy: admin.id, updatedAt: new Date() },
    });
  }

  // ─── TA1 — this week sessions (3 completed, pending submission) ────────────

  const ta1s1Start = new Date('2026-03-17T15:00:00.000Z'); // Mon Mar 17 08:00 Phoenix
  const ta1s1End   = new Date('2026-03-17T17:30:00.000Z'); // +2.5h
  const ta1Session1 = await prisma.workSession.create({
    data: {
      assignmentId: aTa1.id,
      category: 'GRADING',
      mode: 'SCREEN',
      status: 'COMPLETED',
      description: 'Graded midterm exams — batch 1 of 3',
      startedAt: ta1s1Start,
      endedAt: ta1s1End,
      activeMinutes: 145,
      idleMinutes: 5,
      netHours: hrs(2.42),
    },
  });
  await prisma.sessionEvent.createMany({
    data: [
      { sessionId: ta1Session1.id, eventType: 'STARTED', serverTimestamp: ta1s1Start },
      { sessionId: ta1Session1.id, eventType: 'STOPPED',  serverTimestamp: ta1s1End },
    ],
  });

  const ta1s2Start = new Date('2026-03-18T18:00:00.000Z'); // Tue 11:00 Phoenix
  const ta1s2End   = new Date('2026-03-18T20:00:00.000Z'); // +2h
  const ta1Session2 = await prisma.workSession.create({
    data: {
      assignmentId: aTa1.id,
      category: 'OFFICE_HOURS',
      mode: 'IN_PERSON',
      status: 'COMPLETED',
      description: 'Office hours — 4 students attended',
      startedAt: ta1s2Start,
      endedAt: ta1s2End,
      activeMinutes: 120,
      idleMinutes: 0,
      netHours: hrs(2.0),
    },
  });
  await prisma.sessionEvent.createMany({
    data: [
      { sessionId: ta1Session2.id, eventType: 'STARTED', serverTimestamp: ta1s2Start },
      { sessionId: ta1Session2.id, eventType: 'STOPPED',  serverTimestamp: ta1s2End },
    ],
  });

  const ta1s3Start = new Date('2026-03-19T16:00:00.000Z'); // Wed 09:00 Phoenix
  const ta1s3End   = new Date('2026-03-19T17:30:00.000Z'); // +1.5h
  const ta1Session3 = await prisma.workSession.create({
    data: {
      assignmentId: aTa1.id,
      category: 'LAB_PREP',
      mode: 'SCREEN',
      status: 'COMPLETED',
      description: 'Prepared lab 6 materials and test cases',
      startedAt: ta1s3Start,
      endedAt: ta1s3End,
      activeMinutes: 90,
      idleMinutes: 0,
      netHours: hrs(1.5),
    },
  });
  await prisma.sessionEvent.createMany({
    data: [
      { sessionId: ta1Session3.id, eventType: 'STARTED', serverTimestamp: ta1s3Start },
      { sessionId: ta1Session3.id, eventType: 'STOPPED',  serverTimestamp: ta1s3End },
    ],
  });

  // TA1 submits this week — pending instructor review
  const ta1Sub = await prisma.weeklySubmission.create({
    data: {
      assignmentId: aTa1.id,
      weekStart: THIS_WEEK_START,
      weekEnd: THIS_WEEK_END,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-03-20T17:00:00.000Z'),
      totalHours: hrs(5.92),
      totalScreenshots: 0,
    },
  });
  await prisma.workSession.updateMany({
    where: { id: { in: [ta1Session1.id, ta1Session2.id, ta1Session3.id] } },
    data: { submissionId: ta1Sub.id },
  });
  await prisma.auditLog.create({
    data: {
      userId: ta1.id,
      action: 'SUBMITTED',
      entityType: 'WeeklySubmission',
      entityId: ta1Sub.id,
      details: { totalHours: 5.92, sessionCount: 3, weekStart: THIS_WEEK_START.toISOString() },
    },
  });

  // ─── TA2 — last week approved submission ───────────────────────────────────

  const ta2s1Start = new Date('2026-03-10T16:00:00.000Z');
  const ta2s1End   = new Date('2026-03-10T20:00:00.000Z');
  const ta2Session1 = await prisma.workSession.create({
    data: {
      assignmentId: aTa2.id,
      category: 'GRADING',
      mode: 'SCREEN',
      status: 'COMPLETED',
      description: 'Graded assignment 4',
      startedAt: ta2s1Start,
      endedAt: ta2s1End,
      activeMinutes: 230,
      idleMinutes: 10,
      netHours: hrs(3.83),
    },
  });
  await prisma.sessionEvent.createMany({
    data: [
      { sessionId: ta2Session1.id, eventType: 'STARTED', serverTimestamp: ta2s1Start },
      { sessionId: ta2Session1.id, eventType: 'STOPPED',  serverTimestamp: ta2s1End },
    ],
  });

  const ta2Sub = await prisma.weeklySubmission.create({
    data: {
      assignmentId: aTa2.id,
      weekStart: LAST_WEEK_START,
      weekEnd: LAST_WEEK_END,
      status: 'APPROVED',
      submittedAt: new Date('2026-03-14T20:00:00.000Z'),
      reviewedAt: new Date('2026-03-15T14:00:00.000Z'),
      totalHours: hrs(3.83),
      totalScreenshots: 0,
      reviewerId: inst1.id,
    },
  });
  await prisma.workSession.update({
    where: { id: ta2Session1.id },
    data: { submissionId: ta2Sub.id },
  });
  await prisma.auditLog.createMany({
    data: [
      {
        userId: ta2.id,
        action: 'SUBMITTED',
        entityType: 'WeeklySubmission',
        entityId: ta2Sub.id,
        details: { totalHours: 3.83, sessionCount: 1 },
        createdAt: new Date('2026-03-14T20:00:00.000Z'),
      },
      {
        userId: inst1.id,
        action: 'APPROVED',
        entityType: 'WeeklySubmission',
        entityId: ta2Sub.id,
        details: { totalHours: 3.83 },
        createdAt: new Date('2026-03-15T14:00:00.000Z'),
      },
    ],
  });

  // ─── TA3 — rejected once, now resubmitted (pending) ───────────────────────

  const ta3s1Start = new Date('2026-03-17T15:00:00.000Z');
  const ta3s1End   = new Date('2026-03-17T18:00:00.000Z');
  const ta3Session1 = await prisma.workSession.create({
    data: {
      assignmentId: aTa3.id,
      category: 'TUTORING',
      mode: 'SCREEN',
      status: 'COMPLETED',
      description: 'One-on-one tutoring session — SQL joins',
      startedAt: ta3s1Start,
      endedAt: ta3s1End,
      activeMinutes: 175,
      idleMinutes: 5,
      netHours: hrs(2.92),
    },
  });
  await prisma.sessionEvent.createMany({
    data: [
      { sessionId: ta3Session1.id, eventType: 'STARTED', serverTimestamp: ta3s1Start },
      { sessionId: ta3Session1.id, eventType: 'STOPPED',  serverTimestamp: ta3s1End },
    ],
  });

  const ta3Sub = await prisma.weeklySubmission.create({
    data: {
      assignmentId: aTa3.id,
      weekStart: THIS_WEEK_START,
      weekEnd: THIS_WEEK_END,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-03-20T19:00:00.000Z'),
      totalHours: hrs(2.92),
      totalScreenshots: 0,
      rejectionReason: 'Please add more detail in the session description',
    },
  });
  await prisma.workSession.update({
    where: { id: ta3Session1.id },
    data: { submissionId: ta3Sub.id },
  });
  await prisma.auditLog.createMany({
    data: [
      {
        userId: ta3.id,
        action: 'SUBMITTED',
        entityType: 'WeeklySubmission',
        entityId: ta3Sub.id,
        details: { totalHours: 2.92 },
        createdAt: new Date('2026-03-18T20:00:00.000Z'),
      },
      {
        userId: inst2.id,
        action: 'REJECTED',
        entityType: 'WeeklySubmission',
        entityId: ta3Sub.id,
        details: { reason: 'Please add more detail in the session description' },
        createdAt: new Date('2026-03-19T14:00:00.000Z'),
      },
      {
        userId: ta3.id,
        action: 'SUBMITTED',
        entityType: 'WeeklySubmission',
        entityId: ta3Sub.id,
        details: { totalHours: 2.92, resubmission: true },
        createdAt: new Date('2026-03-20T19:00:00.000Z'),
      },
    ],
  });

  // ─── Settings change audit entries ─────────────────────────────────────────

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SETTINGS_CHANGED',
        entityType: 'SystemSettings',
        entityId: 'system',
        details: { field: 'idleTimeoutMinutes', from: 10, to: 15 },
        createdAt: new Date('2026-03-10T09:00:00.000Z'),
      },
      {
        userId: admin.id,
        action: 'USER_INVITED',
        entityType: 'User',
        entityId: ta4.id,
        details: { email: 'ta4@nau.edu', courseCode: 'CS345' },
        createdAt: new Date('2026-03-08T11:00:00.000Z'),
      },
    ],
  });

  console.log('\n✅ Seed complete!\n');
  console.log('Login accounts (password: password123):');
  console.log('  admin@nau.edu        → Admin dashboard');
  console.log('  instructor1@nau.edu  → Instructor dashboard (CS249, 2 pending reviews)');
  console.log('  instructor2@nau.edu  → Instructor dashboard (CS345, 1 pending review)');
  console.log('  ta1@nau.edu          → TA dashboard (5.92h this week, submitted)');
  console.log('  ta2@nau.edu          → TA dashboard (last week approved)');
  console.log('  ta3@nau.edu          → TA dashboard (resubmitted after rejection)');
  console.log('  ta4@nau.edu          → TA dashboard (no activity)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

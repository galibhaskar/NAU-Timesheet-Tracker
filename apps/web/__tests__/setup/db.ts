/**
 * Integration test database helpers.
 *
 * Provides resetDb() to truncate all tables between tests, and factory
 * functions that INSERT real rows into PostgreSQL so route handlers can
 * query them via the shared Prisma client.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const testPrisma = new PrismaClient();

/**
 * Delete all rows from every table in reverse-FK order so no constraint is
 * violated. Call this in beforeEach for each integration test suite.
 */
export async function resetDb(): Promise<void> {
  // Cascade-safe deletion order (children before parents)
  await testPrisma.auditLog.deleteMany();
  await testPrisma.systemSettings.deleteMany();
  await testPrisma.sessionEvent.deleteMany();
  await testPrisma.screenshot.deleteMany();
  await testPrisma.photoProof.deleteMany();
  // WorkSession.submissionId is nullable — null it first to break the cycle
  await testPrisma.workSession.updateMany({ data: { submissionId: null } });
  await testPrisma.workSession.deleteMany();
  await testPrisma.weeklySubmission.deleteMany();
  await testPrisma.courseAssignment.deleteMany();
  await testPrisma.course.deleteMany();
  await testPrisma.user.deleteMany();
}

// ─── Seed helpers ──────────────────────────────────────────────────────────

export async function createTestUser(overrides: {
  email?: string;
  name?: string;
  role?: 'ADMIN' | 'INSTRUCTOR' | 'TA';
  password?: string;
} = {}) {
  const hash = await bcrypt.hash(overrides.password ?? 'password123', 4); // cost 4 for speed
  return testPrisma.user.create({
    data: {
      email: overrides.email ?? `user-${Date.now()}@nau.edu`,
      name: overrides.name ?? 'Test User',
      password: hash,
      role: overrides.role ?? 'TA',
    },
  });
}

export async function createTestCourse(overrides: {
  code?: string;
  name?: string;
  enrolledStudents?: number;
  hoursPerStudent?: number;
} = {}) {
  return testPrisma.course.create({
    data: {
      name: overrides.name ?? 'Data Structures',
      code: overrides.code ?? 'CS249',
      semester: 'SPRING',
      year: 2026,
      enrolledStudents: overrides.enrolledStudents ?? 100,
      hoursPerStudent: overrides.hoursPerStudent ?? 0.15,
    },
  });
}

export async function createTestAssignment(
  userId: string,
  courseId: string,
  role: 'TA' | 'INSTRUCTOR' = 'TA'
) {
  return testPrisma.courseAssignment.create({
    data: { userId, courseId, role },
  });
}

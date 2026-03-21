import type { User, Course, CourseAssignment, WorkSession, SessionEvent, WeeklySubmission } from '@prisma/client';

let counter = 0;
const uid = () => `${++counter}`.padStart(8, '0') + '-0000-0000-0000-000000000000';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: uid(),
    email: `user${counter}@nau.edu`,
    name: 'Test User',
    password: '$2b$12$hashed',
    role: 'TA',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: uid(),
    name: 'Data Structures',
    code: 'CS 249',
    semester: 'SPRING',
    year: 2026,
    enrolledStudents: 100,
    hoursPerStudent: 0.15 as unknown as Course['hoursPerStudent'],
    overrideWeeklyBudget: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeAssignment(overrides: Partial<CourseAssignment> = {}): CourseAssignment {
  return {
    id: uid(),
    userId: uid(),
    courseId: uid(),
    role: 'TA',
    maxWeeklyHours: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeSession(overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: uid(),
    assignmentId: uid(),
    submissionId: null,
    category: 'GRADING',
    mode: 'SCREEN',
    description: null,
    startedAt: new Date('2026-03-17T09:00:00Z'),
    endedAt: null,
    activeMinutes: 0,
    idleMinutes: 0,
    netHours: 0 as unknown as WorkSession['netHours'],
    status: 'ACTIVE',
    createdAt: new Date('2026-03-17T09:00:00Z'),
    ...overrides,
  };
}

export function makeEvent(
  eventType: 'STARTED' | 'PAUSED' | 'RESUMED' | 'STOPPED',
  serverTimestamp: Date,
  overrides: Partial<SessionEvent> = {}
): SessionEvent {
  return {
    id: uid(),
    sessionId: uid(),
    eventType,
    serverTimestamp,
    clientTimestamp: null,
    createdAt: serverTimestamp,
    ...overrides,
  };
}

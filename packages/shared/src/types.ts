import {
  SessionCategory,
  SessionMode,
  SessionStatus,
  SubmissionStatus,
  Role,
  CourseRole,
  Semester,
} from './enums';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface StartSessionRequest {
  assignmentId: string;
  category: SessionCategory;
  mode: SessionMode;
  description?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  startTime: string;
}

export interface StopSessionRequest {
  sessionId: string;
  description?: string;
}

export interface StopSessionResponse {
  sessionId: string;
  netMinutes: number;
  netHours: number;
}

export interface PauseSessionRequest {
  sessionId: string;
}

export interface ResumeSessionRequest {
  sessionId: string;
}

export interface SessionSummary {
  id: string;
  category: SessionCategory;
  mode: SessionMode;
  status: SessionStatus;
  startTime: string;
  endTime?: string;
  netMinutes: number;
  netHours: number;
  description?: string;
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export interface SubmitWeekRequest {
  assignmentId: string;
  weekStart: string; // ISO date
  taNote?: string;
}

export interface SubmitWeekResponse {
  submissionId: string;
  totalHours: number;
  status: SubmissionStatus;
}

export interface ApproveSubmissionRequest {
  submissionId: string;
  reviewNote?: string;
}

export interface RejectSubmissionRequest {
  submissionId: string;
  reviewNote: string;
}

export interface SubmissionSummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: SubmissionStatus;
  totalHours: number;
  taNote?: string;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface TADashboardData {
  activeSession?: SessionSummary;
  weeklyHours: number;
  maxHoursPerWeek: number;
  submissions: SubmissionSummary[];
}

export interface InstructorDashboardData {
  courses: CourseSummary[];
  pendingSubmissions: SubmissionSummary[];
}

export interface CourseSummary {
  id: string;
  prefix: string;
  number: string;
  title: string;
  semester: Semester;
  year: number;
  taCount: number;
  totalBudget: number;
  spentBudget: number;
}

export interface AdminDashboardData {
  totalUsers: number;
  totalCourses: number;
  activeSessions: number;
  pendingSubmissions: number;
}

// ─── Users & Courses ──────────────────────────────────────────────────────────

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export interface CreateCourseRequest {
  prefix: string;
  number: string;
  title: string;
  semester: Semester;
  year: number;
}

export interface CreateAssignmentRequest {
  userId: string;
  courseId: string;
  role: CourseRole;
  maxHoursPerWeek: number;
  hourlyRate: number;
  totalBudget: number;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportRequest {
  courseId?: string;
  weekStart?: string;
  weekEnd?: string;
  format: 'csv' | 'pdf';
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── TA Cross-Course ──────────────────────────────────────────────────────────

export interface TACrossCourseHours {
  userId: string;
  userName: string;
  courses: {
    courseId: string;
    courseName: string;
    weeklyHours: number;
    maxHours: number;
  }[];
  totalWeeklyHours: number;
}

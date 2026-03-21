import type { Course } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Returns the effective weekly hour budget for a course.
 * If override_weekly_budget is set, it takes precedence.
 * Otherwise: enrolled_students × hours_per_student
 */
export function getWeeklyBudget(course: Pick<Course, 'enrolledStudents' | 'hoursPerStudent' | 'overrideWeeklyBudget'>): number {
  if (course.overrideWeeklyBudget !== null) {
    return Number(course.overrideWeeklyBudget);
  }
  return Number(course.enrolledStudents) * Number(course.hoursPerStudent);
}

/** Returns budget utilization status for dashboard traffic-light */
export type BudgetStatus = 'green' | 'yellow' | 'red';

export function getBudgetStatus(usedHours: number, budgetHours: number): BudgetStatus {
  if (budgetHours === 0) return 'red';
  const pct = usedHours / budgetHours;
  if (pct < 0.8) return 'green';
  if (pct <= 1.0) return 'yellow';
  return 'red';
}

export function getBudgetPercentage(usedHours: number, budgetHours: number): number {
  if (budgetHours === 0) return 100;
  return Math.round((usedHours / budgetHours) * 100);
}

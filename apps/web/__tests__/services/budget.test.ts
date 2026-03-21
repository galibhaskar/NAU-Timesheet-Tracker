import { getWeeklyBudget, getBudgetStatus, getBudgetPercentage } from '@/lib/services/budget';
import type { Course } from '@prisma/client';

function makeCourse(overrides: Partial<Course> = {}): Pick<Course, 'enrolledStudents' | 'hoursPerStudent' | 'overrideWeeklyBudget'> {
  return {
    enrolledStudents: 100,
    hoursPerStudent: 0.15 as unknown as Course['hoursPerStudent'],
    overrideWeeklyBudget: null,
    ...overrides,
  };
}

describe('getWeeklyBudget', () => {
  it('computes from formula: enrolled × hoursPerStudent', () => {
    expect(getWeeklyBudget(makeCourse())).toBe(15); // 100 × 0.15
  });

  it('uses override when set', () => {
    expect(getWeeklyBudget(makeCourse({ overrideWeeklyBudget: 20 as unknown as Course['overrideWeeklyBudget'] }))).toBe(20);
  });

  it('override of 0 is falsy — falls back to formula', () => {
    // null override → formula
    expect(getWeeklyBudget(makeCourse({ overrideWeeklyBudget: null }))).toBe(15);
  });
});

describe('getBudgetStatus', () => {
  it('returns green when usage < 80%', () => {
    expect(getBudgetStatus(10, 20)).toBe('green');
  });

  it('returns yellow at exactly 80%', () => {
    expect(getBudgetStatus(16, 20)).toBe('yellow');
  });

  it('returns yellow at 99%', () => {
    expect(getBudgetStatus(19.8, 20)).toBe('yellow');
  });

  it('returns red when over 100%', () => {
    expect(getBudgetStatus(21, 20)).toBe('red');
  });

  it('returns red when budget is 0', () => {
    expect(getBudgetStatus(0, 0)).toBe('red');
  });
});

describe('getBudgetPercentage', () => {
  it('returns correct percentage', () => {
    expect(getBudgetPercentage(15, 20)).toBe(75);
  });

  it('returns 100 when budget is 0', () => {
    expect(getBudgetPercentage(5, 0)).toBe(100);
  });
});

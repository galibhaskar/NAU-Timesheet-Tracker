import { canTransition, MAX_REJECTION_CYCLES } from '@/lib/services/submission-service';
import type { SubmissionStatus } from '@prisma/client';

describe('canTransition', () => {
  const cases: [SubmissionStatus, SubmissionStatus, boolean][] = [
    ['DRAFT',     'SUBMITTED', true],
    ['SUBMITTED', 'APPROVED',  true],
    ['SUBMITTED', 'REJECTED',  true],
    ['REJECTED',  'SUBMITTED', true],
    ['APPROVED',  'REJECTED',  false],
    ['APPROVED',  'SUBMITTED', false],
    ['DRAFT',     'APPROVED',  false],
    ['DRAFT',     'REJECTED',  false],
  ];

  test.each(cases)('%s → %s should be %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });
});

describe('MAX_REJECTION_CYCLES', () => {
  it('is 3', () => {
    expect(MAX_REJECTION_CYCLES).toBe(3);
  });
});

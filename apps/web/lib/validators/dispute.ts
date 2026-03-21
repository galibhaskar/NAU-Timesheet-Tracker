import { z } from 'zod';

export const DisputeHoldSchema = z.object({
  disputeHold: z.boolean(),
});

export type DisputeHoldInput = z.infer<typeof DisputeHoldSchema>;

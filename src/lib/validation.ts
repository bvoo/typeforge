import { z } from "zod";

export const SubmissionPayloadSchema = z.object({
  answers: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .default({}),
});

export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;

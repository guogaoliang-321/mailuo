import { z } from "zod";

export const createRequestSchema = z.object({
  title: z.string().min(1, "请输入对接请求标题"),
  description: z.string().min(1, "请描述对接需求"),
  targetProjectId: z.string().uuid().nullable().default(null),
  relayPath: z.array(z.string().uuid()).default([]),
});

export const respondRequestSchema = z.object({
  action: z.enum(["consent", "reject", "terminal"]),
  message: z.string().default(""),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type RespondRequestInput = z.infer<typeof respondRequestSchema>;

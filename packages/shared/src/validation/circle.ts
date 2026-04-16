import { z } from "zod";

export const createCircleSchema = z.object({
  name: z.string().min(1, "请输入圈子名称").max(100),
  description: z.string().default(""),
});

export const inviteToCircleSchema = z.object({
  userId: z.string().uuid("无效的用户 ID"),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;
export type InviteToCircleInput = z.infer<typeof inviteToCircleSchema>;

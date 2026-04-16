import { z } from "zod";

const visibilityLevels = ["designated", "circle", "fuzzy"] as const;

export const createRelationshipSchema = z.object({
  alias: z.string().min(1, "请输入代号或备注名"),
  domainTags: z.array(z.string()).min(1, "请至少添加一个领域标签"),
  levelTags: z.array(z.string()).default([]),
  closeness: z.number().int().min(1).max(5),
  visibility: z.enum(visibilityLevels),
  designatedViewerIds: z.array(z.string().uuid()).default([]),
  circleId: z.string().uuid().nullable().default(null),
  notes: z.string().default(""),
});

export const updateRelationshipSchema = createRelationshipSchema.partial();

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;

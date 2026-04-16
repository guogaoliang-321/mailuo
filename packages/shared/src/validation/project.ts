import { z } from "zod";

const projectStages = [
  "prospecting",
  "approved",
  "bidding",
  "announced",
  "in_progress",
  "completed",
] as const;

export const createProjectSchema = z.object({
  name: z.string().min(1, "请输入项目名称").max(200),
  region: z.string().min(1, "请输入项目区域"),
  scale: z.string().min(1, "请输入项目规模"),
  stage: z.enum(projectStages),
  decisionMakerClue: z.string().default(""),
  notes: z.string().default(""),
  circleId: z.string().uuid().nullable().default(null),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectSearchSchema = z.object({
  region: z.string().optional(),
  stage: z.enum(projectStages).optional(),
  keyword: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectSearchInput = z.infer<typeof projectSearchSchema>;

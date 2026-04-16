import { z } from "zod";

const meritRoles = [
  "info_contributor",
  "request_initiator",
  "relay_intermediary",
  "resource_provider",
] as const;

const benefitShareSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(meritRoles),
  percentage: z.number().min(0).max(100),
});

export const proposeBenefitSchema = z.object({
  distribution: z.array(benefitShareSchema).refine(
    (shares) => {
      const total = shares.reduce((sum, s) => sum + s.percentage, 0);
      return Math.abs(total - 100) < 0.01;
    },
    { message: "分配比例总和必须为 100%" }
  ),
});

export type ProposeBenefitInput = z.infer<typeof proposeBenefitSchema>;

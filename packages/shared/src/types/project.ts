export type ProjectStage =
  | "prospecting"    // 前期意向
  | "approved"       // 已立项
  | "bidding"        // 即将招标
  | "announced"      // 已公示
  | "in_progress"    // 进行中
  | "completed";     // 已完成

export interface Project {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: ProjectStage;
  decisionMakerClue: string;
  notes: string;
  contributorId: string;
  circleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: ProjectStage;
  contributorName: string;
  createdAt: string;
}

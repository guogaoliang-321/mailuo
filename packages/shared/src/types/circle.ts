export type CircleMemberRole = "admin" | "member";

export interface Circle {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface CircleMember {
  userId: string;
  displayName: string;
  role: CircleMemberRole;
  joinedAt: string;
}

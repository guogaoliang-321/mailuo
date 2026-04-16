export type UserRole = "admin" | "member";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  domainTags: string[];
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  createdAt: string;
}

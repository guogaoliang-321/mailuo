export type RequestStatus =
  | "pending"
  | "relaying"
  | "fulfilled"
  | "rejected"
  | "expired";

export type RelayStepStatus =
  | "pending"
  | "consented"
  | "rejected"
  | "terminal";

export interface RelayRequest {
  id: string;
  title: string;
  description: string;
  initiatorId: string;
  targetProjectId: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RelayStep {
  order: number;
  userId: string;
  displayName: string;
  status: RelayStepStatus;
  consentedAt: string | null;
}

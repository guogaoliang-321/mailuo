export type MeritRole =
  | "info_contributor"
  | "request_initiator"
  | "relay_intermediary"
  | "resource_provider";

export interface MeritEvent {
  id: string;
  projectId: string;
  userId: string;
  role: MeritRole;
  action: string;
  timestamp: string;
  hash: string;
  prevHash: string | null;
}

export type BenefitStatus = "draft" | "proposed" | "confirmed" | "locked";

export interface BenefitShare {
  userId: string;
  displayName: string;
  role: MeritRole;
  percentage: number;
  confirmed: boolean;
}

export interface BenefitAgreement {
  id: string;
  projectId: string;
  proposedBy: string;
  status: BenefitStatus;
  distribution: BenefitShare[];
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

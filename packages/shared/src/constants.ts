export const PROJECT_STAGE_LABELS: Record<string, string> = {
  prospecting: "前期意向",
  approved: "已立项",
  bidding: "即将招标",
  announced: "已公示",
  in_progress: "进行中",
  completed: "已完成",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  designated: "指定可见",
  circle: "圈内可见",
  fuzzy: "模糊可见",
};

export const CLOSENESS_LABELS: Record<number, string> = {
  1: "仅认识",
  2: "能递话",
  3: "可约见",
  4: "关系密切",
  5: "核心资源",
};

export const MERIT_ROLE_LABELS: Record<string, string> = {
  info_contributor: "信息贡献方",
  request_initiator: "请求发起人",
  relay_intermediary: "协助转介人",
  resource_provider: "资源提供方",
};

export const BENEFIT_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  proposed: "已提议",
  confirmed: "已确认",
  locked: "已锁定",
};

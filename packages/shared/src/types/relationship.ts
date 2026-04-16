export type VisibilityLevel = "designated" | "circle" | "fuzzy";
export type Closeness = 1 | 2 | 3 | 4 | 5;

export interface Relationship {
  id: string;
  ownerId: string;
  alias: string;
  domainTags: string[];
  levelTags: string[];
  closeness: Closeness;
  visibility: VisibilityLevel;
  designatedViewerIds: string[];
  circleId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuzzyRelationship {
  id: string;
  domainTags: string[];
  levelTags: string[];
  region?: string;
  _fuzzy: true;
}

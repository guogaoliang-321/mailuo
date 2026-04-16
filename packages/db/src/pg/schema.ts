import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  bigserial,
  jsonb,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  domainTags: jsonb("domain_tags").$type<string[]>().default([]),
  invitedBy: uuid("invited_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  usedBy: uuid("used_by").references(() => users.id),
  maxUses: integer("max_uses").default(1).notNull(),
  useCount: integer("use_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const circles = pgTable("circles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").default(""),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const circleMembers = pgTable("circle_members", {
  circleId: uuid("circle_id").references(() => circles.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.circleId, t.userId] })]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  scale: varchar("scale", { length: 100 }),
  stage: varchar("stage", { length: 30 }).default("prospecting").notNull(),
  decisionMakerClue: text("decision_maker_clue").default(""),
  notes: text("notes").default(""),
  contributorId: uuid("contributor_id").references(() => users.id).notNull(),
  circleId: uuid("circle_id").references(() => circles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const relationships = pgTable("relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  alias: varchar("alias", { length: 200 }).notNull(),
  domainTags: jsonb("domain_tags").$type<string[]>().default([]),
  levelTags: jsonb("level_tags").$type<string[]>().default([]),
  closeness: integer("closeness").default(3),
  visibility: varchar("visibility", { length: 20 }).default("circle").notNull(),
  designatedViewerIds: jsonb("designated_viewer_ids").$type<string[]>().default([]),
  circleId: uuid("circle_id").references(() => circles.id),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").default(""),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  urgent: boolean("urgent").default(false),
  timeAgo: varchar("time_ago", { length: 50 }),
  initiatorId: uuid("initiator_id").references(() => users.id).notNull(),
  targetProjectId: uuid("target_project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const relaySteps = pgTable("relay_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").references(() => requests.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  stepOrder: integer("step_order").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  consentedAt: timestamp("consented_at"),
});

export const meritEvents = pgTable("merit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 30 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  hash: varchar("hash", { length: 64 }).notNull(),
  prevHash: varchar("prev_hash", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 100 }),
  detail: jsonb("detail"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const encryptionKeys = pgTable("encryption_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const benefitAgreements = pgTable("benefit_agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: varchar("project_id", { length: 100 }).notNull(),
  proposedBy: uuid("proposed_by").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  distribution: jsonb("distribution").notNull(),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

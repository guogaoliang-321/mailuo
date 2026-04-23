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

export const circleInviteCodes = pgTable("circle_invite_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").references(() => circles.id).notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  maxUses: integer("max_uses").default(50).notNull(),
  useCount: integer("use_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
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

// Responses to requests (multiple people can respond)
export const requestResponses = pgTable("request_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").references(() => requests.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'clue' | 'relay'
  message: text("message").notNull(),
  accepted: boolean("accepted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Plaza messages (visible to all circle members across all circles)
export const plazaMessages = pgTable("plaza_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).default("general"), // general, project, relationship, request
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments on projects/relationships/requests
export const plazaReplies = pgTable("plaza_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => plazaMessages.id).notNull(),
  parentId: uuid("parent_id"), // null = top-level; references another plaza_replies.id in DB
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══ Personal CRM ═══

export const myProjects = pgTable("my_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  stage: varchar("stage", { length: 30 }).default("prospecting").notNull(),
  client: varchar("client", { length: 200 }),
  budget: varchar("budget", { length: 100 }),
  region: varchar("region", { length: 100 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes").default(""),
  deadline: timestamp("deadline"),
  deadlineNote: varchar("deadline_note", { length: 200 }),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  isShared: boolean("is_shared").default(false),
  sharedCircleId: uuid("shared_circle_id").references(() => circles.id),
  sharedCircleNames: jsonb("shared_circle_names").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const myContacts = pgTable("my_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  company: varchar("company", { length: 200 }),
  title: varchar("title", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  closeness: integer("closeness").default(3),
  notes: text("notes").default(""),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  reminderDays: integer("reminder_days"), // auto remind every N days
  lastContactedAt: timestamp("last_contacted_at"),
  isShared: boolean("is_shared").default(false),
  sharedCircleId: uuid("shared_circle_id").references(() => circles.id),
  sharedCircleNames: jsonb("shared_circle_names").$type<string[]>().default([]),
  sharedAlias: varchar("shared_alias", { length: 100 }), // alias when shared (hide real name)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactLogs = pgTable("contact_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => myContacts.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).default("note").notNull(), // note, meeting, call, wechat, dinner, plan
  content: text("content").notNull(),
  planDate: timestamp("plan_date"), // for type=plan
  planDone: boolean("plan_done").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 30 }).notNull(), // 'project' | 'relationship' | 'request'
  entityId: uuid("entity_id").notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Circle messages (simple chat)
export const circleMessages = pgTable("circle_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").references(() => circles.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
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

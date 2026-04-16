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
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  invitedBy: uuid("invited_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  usedBy: uuid("used_by").references(() => users.id),
  maxUses: integer("max_uses").default(1).notNull(),
  useCount: integer("use_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
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
  proposedBy: uuid("proposed_by")
    .references(() => users.id)
    .notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  distribution: jsonb("distribution").notNull(),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uuid,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const serviceTypeEnum = pgEnum("service_type", [
  "netflix",
  "spotify",
  "disney",
  "amazon",
  "crunchyroll",
  "youtube",
  "other",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "expired",
  "suspended",
  "pending",
]);

export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "expired",
  "suspended",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "failed",
  "refunded",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "delete_profile",
  "change_password",
  "suspend_access",
  "send_reminder",
  "renewal",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "email",
  "sms",
]);

// ─── Admins ───────────────────────────────────────────────────────────────────
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Shared Accounts (e.g. Netflix, Spotify) ─────────────────────────────────
export const sharedAccounts = pgTable("shared_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  name: text("name").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  maxProfiles: integer("max_profiles").notNull().default(5),
  usedProfiles: integer("used_profiles").notNull().default(0),
  status: accountStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(), // WhatsApp number with country code
  email: text("email"),
  status: clientStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Subscriptions (client assigned to a shared account slot) ────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  sharedAccountId: uuid("shared_account_id")
    .references(() => sharedAccounts.id)
    .notNull(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  profileName: text("profile_name"), // specific profile name/pin assigned
  profilePin: text("profile_pin"),
  startDate: timestamp("start_date").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("XOF"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  status: clientStatusEnum("status").notNull().default("active"),
  autoRenew: boolean("auto_renew").notNull().default(false),
  reminderSent1Day: boolean("reminder_sent_1day").notNull().default(false),
  reminderSent3Days: boolean("reminder_sent_3days").notNull().default(false),
  reminderSent7Days: boolean("reminder_sent_7days").notNull().default(false),
  deliveryMessage: text("delivery_message"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Automation Actions ───────────────────────────────────────────────────────
export const automationActions = pgTable("automation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .references(() => subscriptions.id)
    .notNull(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  actionType: actionTypeEnum("action_type").notNull(),
  status: actionStatusEnum("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  result: text("result"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .references(() => subscriptions.id)
    .notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  channel: notificationChannelEnum("channel").notNull().default("whatsapp"),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull()
    .unique(),
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappPhoneNumber: text("whatsapp_phone_number"),
  defaultCurrency: text("default_currency").notNull().default("XOF"),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(3),
  autoActionOnExpiry: boolean("auto_action_on_expiry").notNull().default(true),
  defaultExpiryAction: actionTypeEnum("default_expiry_action")
    .notNull()
    .default("suspend_access"),
  messageTemplate1Day: text("message_template_1day"),
  messageTemplate3Days: text("message_template_3days"),
  messageTemplate7Days: text("message_template_7days"),
  deliveryMessageTemplate: text("delivery_message_template"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Payments ────────────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .references(() => subscriptions.id)
    .notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  method: text("method"), // mobile_money, cash, card, etc.
  reference: text("reference"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

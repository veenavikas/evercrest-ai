import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  uniqueIndex,
  index,
  jsonb
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------- Enums (Mapped to text with TS types) ----------
export type Role = "tenant" | "admin";
export type WorkOrderStatus = "new" | "acknowledged" | "in_progress" | "resolved" | "closed";
export type WorkOrderUrgency = "low" | "medium" | "high" | "emergency";
export type EmailStatus = "queued" | "sent" | "failed";
export type AmenityBookingStatus = "confirmed" | "cancelled" | "completed";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type DocumentCategory = "lease" | "policy" | "notice" | "other";

// ---------- Properties ----------
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // used in property-specific URLs
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  heroImageUrl: text("hero_image_url"),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("properties_slug_idx").on(table.slug),
}));

// ---------- Units ----------
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  unitNumber: text("unit_number").notNull(),
  floor: text("floor"),
  bedroomCount: integer("bedroom_count"),
  isOccupied: boolean("is_occupied").notNull().default(false),
}, (table) => ({
  propertyIdx: index("units_property_idx").on(table.propertyId),
  uniqueUnit: uniqueIndex("units_property_unit_idx").on(table.propertyId, table.unitNumber),
}));

// ---------- Allowed Emails (Whitelist) ----------
export const allowedEmails = pgTable("allowed_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").$type<Role>().notNull().default("tenant"),
  propertyId: integer("property_id").references(() => properties.id), // Added for multi-property
  addedBy: integer("added_by"), // FK -> users.id (admin who added this entry)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("allowed_emails_email_idx").on(table.email),
}));

// ---------- Users ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: text("role").$type<Role>().notNull().default("tenant"),
  propertyId: integer("property_id").references(() => properties.id),
  unitId: integer("unit_id").references(() => units.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));


// ---------- Conversations ----------
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  isArchived: boolean("is_archived").notNull().default(false),
}, (table) => ({
  userIdx: index("conversations_user_idx").on(table.userId),
}));

// ---------- Messages ----------
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  sender: text("sender").$type<"tenant" | "assistant">().notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  convIdx: index("messages_conversation_idx").on(table.conversationId),
}));

// ---------- Work Orders ----------
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  referenceCode: text("reference_code").notNull().unique(), // e.g. WO-20260625-1
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  tenantId: integer("tenant_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  category: text("category").notNull(), // plumbing/electrical/HVAC
  description: text("description").notNull(),
  unitNumber: text("unit_number"),
  urgency: text("urgency").$type<WorkOrderUrgency>().notNull().default("medium"),
  status: text("status").$type<WorkOrderStatus>().notNull().default("new"),
  preferredAccessTime: text("preferred_access_time"),
  internalNotes: text("internal_notes"),
  assignedAdminId: integer("assigned_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
}, (table) => ({
  refIdx: uniqueIndex("work_orders_ref_idx").on(table.referenceCode),
  statusIdx: index("work_orders_status_idx").on(table.status),
  tenantIdx: index("work_orders_tenant_idx").on(table.tenantId),
  createdIdx: index("work_orders_created_idx").on(table.createdAt),
}));

// ---------- Email Logs ----------
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  template: text("template").notNull(), // magic_link/new_work_order/status_update
  relatedWorkOrderId: integer("related_work_order_id").references(() => workOrders.id),
  status: text("status").$type<EmailStatus>().notNull().default("queued"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("email_logs_status_idx").on(table.status),
}));

// ---------- AI Usage Logs ----------
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  feature: text("feature").notNull(), // "chat" | "extraction" | "analytics"
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  relatedConversationId: integer("related_conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  featureIdx: index("ai_usage_feature_idx").on(table.feature),
}));

// ---------- System / Audit Logs ----------
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  metadata: jsonb("metadata"), // jsonb instead of text
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventIdx: index("system_logs_event_idx").on(table.eventType),
  createdIdx: index("system_logs_created_idx").on(table.createdAt),
}));

// ---------- Amenities ----------
export const amenities = pgTable("amenities", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(), // "Rooftop Pool", "Fitness Center"
  description: text("description"),
  imageUrl: text("image_url"),
  requiresBooking: boolean("requires_booking").notNull().default(true),
  maxCapacity: integer("max_capacity"),
  bookingSlotMinutes: integer("booking_slot_minutes").notNull().default(60),
  openTime: text("open_time").notNull().default("08:00"), // "HH:MM"
  closeTime: text("close_time").notNull().default("22:00"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  propertyIdx: index("amenities_property_idx").on(table.propertyId),
}));

// ---------- Amenity Bookings ----------
export const amenityBookings = pgTable("amenity_bookings", {
  id: serial("id").primaryKey(),
  amenityId: integer("amenity_id").notNull().references(() => amenities.id),
  tenantId: integer("tenant_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").$type<AmenityBookingStatus>().notNull().default("confirmed"),
  partySize: integer("party_size").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
}, (table) => ({
  amenityTimeIdx: index("amenity_bookings_amenity_time_idx").on(table.amenityId, table.startTime),
  tenantIdx: index("amenity_bookings_tenant_idx").on(table.tenantId),
}));

// ---------- Announcements ----------
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: text("priority").$type<AnnouncementPriority>().notNull().default("normal"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdByAdminId: integer("created_by_admin_id").references(() => users.id),
}, (table) => ({
  propertyIdx: index("announcements_property_idx").on(table.propertyId),
  publishedIdx: index("announcements_published_idx").on(table.publishedAt),
}));

// ---------- Documents ----------
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id), // null = global/all properties
  tenantId: integer("tenant_id").references(() => users.id), // null = visible to all tenants of the property
  category: text("category").$type<DocumentCategory>().notNull().default("policy"),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedByAdminId: integer("uploaded_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  propertyIdx: index("documents_property_idx").on(table.propertyId),
  tenantIdx: index("documents_tenant_idx").on(table.tenantId),
}));

// ---------- Resident Directory ----------
export const directoryEntries = pgTable("directory_entries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => users.id),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  displayName: text("display_name").notNull(),
  unitNumber: text("unit_number"),
  showInDirectory: boolean("show_in_directory").notNull().default(false), // opt-in, default OFF
  contactEmailVisible: boolean("contact_email_visible").notNull().default(false),
  bio: text("bio"),
}, (table) => ({
  propertyIdx: index("directory_property_idx").on(table.propertyId),
  tenantIdx: uniqueIndex("directory_tenant_idx").on(table.tenantId),
}));

// ---------- Relations ----------
export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(conversations),
  workOrders: many(workOrders),
  property: one(properties, { fields: [users.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [users.unitId], references: [units.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
  workOrder: many(workOrders),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  conversation: one(conversations, { fields: [workOrders.conversationId], references: [conversations.id] }),
  tenant: one(users, { fields: [workOrders.tenantId], references: [users.id] }),
  assignedAdmin: one(users, { fields: [workOrders.assignedAdminId], references: [users.id] }),
  property: one(properties, { fields: [workOrders.propertyId], references: [properties.id] }),
}));

export const propertiesRelations = relations(properties, ({ many }) => ({
  units: many(units),
  amenities: many(amenities),
  announcements: many(announcements),
  documents: many(documents),
}));

export const amenitiesRelations = relations(amenities, ({ one, many }) => ({
  property: one(properties, { fields: [amenities.propertyId], references: [properties.id] }),
  bookings: many(amenityBookings),
}));

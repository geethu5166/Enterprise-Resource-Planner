import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tendersTable = pgTable("tenders", {
  id: serial("id").primaryKey(),
  tenderNumber: text("tender_number").notNull().unique(),
  title: text("title").notNull(),
  client: text("client").notNull(),
  location: text("location").notNull(),
  estimatedValue: numeric("estimated_value", { precision: 15, scale: 2 }).notNull(),
  bidAmount: numeric("bid_amount", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("open"),
  submissionDate: text("submission_date").notNull(),
  openingDate: text("opening_date").notNull(),
  description: text("description"),
  type: text("type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTenderSchema = createInsertSchema(tendersTable).omit({ id: true, createdAt: true });
export type InsertTender = z.infer<typeof insertTenderSchema>;
export type Tender = typeof tendersTable.$inferSelect;

import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  client: text("client").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("planning"),
  budget: numeric("budget", { precision: 15, scale: 2 }).notNull().default("0"),
  spent: numeric("spent", { precision: 15, scale: 2 }).notNull().default("0"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  description: text("description"),
  progress: integer("progress").notNull().default(0),
  projectManager: text("project_manager").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

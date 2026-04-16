import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  type: text("type").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().default("available"),
  driver: text("driver"),
  assignedProject: text("assigned_project"),
  lastService: text("last_service"),
  nextService: text("next_service"),
  fuelType: text("fuel_type").notNull(),
  odometer: numeric("odometer", { precision: 10, scale: 1 }).notNull().default("0"),
  insuranceExpiry: text("insurance_expiry"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceRecordsTable = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  cost: numeric("cost", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  completedDate: text("completed_date"),
  status: text("status").notNull().default("pending"),
  mechanicName: text("mechanic_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fuelLogsTable = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  liters: numeric("liters", { precision: 10, scale: 2 }).notNull(),
  costPerLiter: numeric("cost_per_liter", { precision: 10, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 15, scale: 2 }).notNull(),
  odometer: numeric("odometer", { precision: 10, scale: 1 }).notNull(),
  date: text("date").notNull(),
  filledBy: text("filled_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecordsTable).omit({ id: true, createdAt: true });
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type MaintenanceRecord = typeof maintenanceRecordsTable.$inferSelect;

export const insertFuelLogSchema = createInsertSchema(fuelLogsTable).omit({ id: true, createdAt: true });
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;
export type FuelLog = typeof fuelLogsTable.$inferSelect;

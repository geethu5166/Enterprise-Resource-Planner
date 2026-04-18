import { pgTable, serial, text, numeric, timestamp, varchar, integer, pgEnum } from "drizzle-orm/pg-core";

// Enums
export const projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed", "cancelled"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue"]);
export const poStatusEnum = pgEnum("po_status", ["draft", "pending_approval", "approved", "ordered", "received", "cancelled"]);
export const materialCategoryEnum = pgEnum("material_category", ["cement", "steel", "sand", "aggregate", "metal", "wood", "electrical", "plumbing", "other"]);
export const tenderStatusEnum = pgEnum("tender_status", ["open", "submitted", "under_evaluation", "awarded", "lost", "cancelled"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["available", "in_use", "maintenance", "out_of_service"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["inbound", "outbound", "adjustment"]);

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  client: varchar("client", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  status: projectStatusEnum("status").notNull().default("planning"),
  budget: numeric("budget", { precision: 15, scale: 2 }).notNull(),
  spent: numeric("spent", { precision: 15, scale: 2 }).notNull().default("0"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  description: text("description"),
  progress: integer("progress").notNull().default(0),
  projectManager: varchar("project_manager", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: varchar("description", { length: 500 }),
  date: timestamp("date").notNull(),
  gstAmount: numeric("gst_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  gstRate: integer("gst_rate").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 15, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  gstNumber: varchar("gst_number", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: poStatusEnum("status").notNull().default("draft"),
  description: text("description"),
  orderDate: timestamp("order_date").notNull(),
  expectedDelivery: timestamp("expected_delivery"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Materials
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: materialCategoryEnum("category").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  minimumStock: numeric("minimum_stock", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Stock Movements
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tenders
export const tenders = pgTable("tenders", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  client: varchar("client", { length: 255 }).notNull(),
  estimatedValue: numeric("estimated_value", { precision: 15, scale: 2 }).notNull(),
  status: tenderStatusEnum("status").notNull().default("open"),
  deadlineDate: timestamp("deadline_date").notNull(),
  bidAmount: numeric("bid_amount", { precision: 15, scale: 2 }),
  winDate: timestamp("win_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  registrationNumber: varchar("registration_number", { length: 50 }).notNull().unique(),
  model: varchar("model", { length: 255 }).notNull(),
  status: vehicleStatusEnum("status").notNull().default("available"),
  purchaseDate: timestamp("purchase_date").notNull(),
  fuelCapacity: numeric("fuel_capacity", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Maintenance Records
export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  description: text("description").notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Fuel Logs
export const fuelLogs = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  department: varchar("department", { length: 100 }).notNull(),
  designation: varchar("designation", { length: 100 }).notNull(),
  salary: numeric("salary", { precision: 12, scale: 2 }).notNull(),
  status: employeeStatusEnum("status").notNull().default("active"),
  joinDate: timestamp("join_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  description: text("description").notNull(),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

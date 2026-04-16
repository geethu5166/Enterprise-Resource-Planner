import { Router, type IRouter } from "express";
import {
  db,
  projectsTable,
  transactionsTable,
  invoicesTable,
  purchaseOrdersTable,
  vehiclesTable,
  materialsTable,
  tendersTable,
  employeesTable,
  maintenanceRecordsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [projects, transactions, invoices, orders, vehicles, materials, tenders, employees] = await Promise.all([
    db.select().from(projectsTable),
    db.select().from(transactionsTable),
    db.select().from(invoicesTable),
    db.select().from(purchaseOrdersTable),
    db.select().from(vehiclesTable),
    db.select().from(materialsTable),
    db.select().from(tendersTable),
    db.select().from(employeesTable),
  ]);
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthStr));
  res.json({
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === "active").length,
    totalRevenue: transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
    pendingInvoices: invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.totalAmount), 0),
    openTenders: tenders.filter(t => t.status === "open").length,
    vehiclesInMaintenance: vehicles.filter(v => v.status === "maintenance").length,
    lowStockItems: materials.filter(m => Number(m.currentStock) <= Number(m.minimumStock)).length,
    pendingPurchaseOrders: orders.filter(o => o.status === "pending_approval").length,
    totalEmployees: employees.filter(e => e.status === "active").length,
    monthlyExpenses: monthlyTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    monthlyIncome: monthlyTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
  });
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const activities: Array<{ id: number; type: string; description: string; module: string; createdAt: string }> = [];
  const [projects, orders, tenders, maintenanceRecords] = await Promise.all([
    db.select().from(projectsTable).orderBy(projectsTable.createdAt),
    db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt),
    db.select().from(tendersTable).orderBy(tendersTable.createdAt),
    db.select().from(maintenanceRecordsTable).orderBy(maintenanceRecordsTable.createdAt),
  ]);

  projects.slice(-3).forEach((p, i) => activities.push({
    id: i + 1,
    type: "project",
    description: `Project "${p.name}" is ${p.status}`,
    module: "Projects",
    createdAt: p.createdAt.toISOString(),
  }));
  orders.slice(-3).forEach((o, i) => activities.push({
    id: 100 + i,
    type: "purchase_order",
    description: `PO ${o.poNumber} status: ${o.status}`,
    module: "Procurement",
    createdAt: o.createdAt.toISOString(),
  }));
  tenders.slice(-3).forEach((t, i) => activities.push({
    id: 200 + i,
    type: "tender",
    description: `Tender "${t.title}" - ${t.status}`,
    module: "Tenders",
    createdAt: t.createdAt.toISOString(),
  }));
  maintenanceRecords.slice(-2).forEach((m, i) => activities.push({
    id: 300 + i,
    type: "maintenance",
    description: `Vehicle maintenance: ${m.description}`,
    module: "Vehicles",
    createdAt: m.createdAt.toISOString(),
  }));

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(activities.slice(0, 10));
});

export default router;

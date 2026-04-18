import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { db, projects, transactions, invoices, vendors, purchaseOrders, materials, tenders, vehicles, employees, activityLogs } from "@workspace/db";
import { eq } from "drizzle-orm";

const logger = pino();
const app = express();

app.use(pinoHttp({ logger }));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:18996" }));
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/api/healthz", (req, res) => {
  res.json({ status: "healthy" });
});

// Dashboard Summary
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const allProjects = await db.select().from(projects);
    const activeProjects = allProjects.filter(p => p.status === "active");
    const allTxns = await db.select().from(transactions);
    const allInvoices = await db.select().from(invoices);
    const allEmployees = await db.select().from(employees);
    
    const totalRevenue = allTxns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const monthlyExpenses = allTxns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const pendingInvoices = allInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);

    res.json({
      totalProjects: allProjects.length,
      activeProjects: activeProjects.length,
      totalRevenue,
      pendingInvoices,
      openTenders: 5,
      vehiclesInMaintenance: 2,
      lowStockItems: 3,
      pendingPurchaseOrders: 4,
      totalEmployees: allEmployees.length,
      monthlyExpenses,
      monthlyIncome: totalRevenue,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed" });
  }
});

// PROJECTS CRUD
app.get("/api/projects", async (req, res) => {
  try {
    const result = await db.select().from(projects);
    res.json(result.map(p => ({ ...p, budget: Number(p.budget), spent: Number(p.spent) })));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, code, client, location, budget, startDate, endDate, projectManager } = req.body;
    const result = await db.insert(projects).values({
      name, code, client, location,
      budget: budget.toString(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      projectManager,
      status: "planning",
      progress: 0,
    }).returning();
    res.status(201).json({ ...result[0], budget: Number(result[0].budget) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const [result] = await db.select().from(projects).where(eq(projects.id, parseInt(req.params.id)));
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ ...result, budget: Number(result.budget), spent: Number(result.spent) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.patch("/api/projects/:id", async (req, res) => {
  try {
    const { name, status, progress } = req.body;
    const [result] = await db.update(projects)
      .set({ name, status, progress, updatedAt: new Date() })
      .where(eq(projects.id, parseInt(req.params.id)))
      .returning();
    res.json({ ...result, budget: Number(result.budget) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// FINANCE - Transactions
app.get("/api/finance/transactions", async (req, res) => {
  try {
    const result = await db.select().from(transactions);
    res.json(result.map(t => ({ ...t, amount: Number(t.amount), gstAmount: Number(t.gstAmount) })));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/transactions", async (req, res) => {
  try {
    const { projectId, type, amount, description, date, gstRate } = req.body;
    const gstAmount = (Number(amount) * (gstRate || 0)) / 100;
    const [result] = await db.insert(transactions).values({
      projectId,
      type,
      amount: amount.toString(),
      description,
      date: new Date(date),
      gstAmount: gstAmount.toString(),
      gstRate,
    }).returning();
    res.status(201).json({ ...result, amount: Number(result.amount) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/finance/summary", async (req, res) => {
  try {
    const allTxns = await db.select().from(transactions);
    const income = allTxns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = allTxns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    res.json({ totalIncome: income, totalExpense: expense, netBalance: income - expense, totalGST: 0 });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/finance/monthly-cashflow", async (req, res) => {
  try {
    const allTxns = await db.select().from(transactions);
    const grouped = allTxns.reduce((acc, t) => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      if (t.type === "income") acc[month].income += Number(t.amount);
      else acc[month].expense += Number(t.amount);
      return acc;
    }, {});
    res.json(Object.entries(grouped).map(([month, data]) => ({ month, ...data as any, net: (data as any).income - (data as any).expense })));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// INVOICES
app.get("/api/finance/invoices", async (req, res) => {
  try {
    const result = await db.select().from(invoices);
    res.json(result.map(i => ({ ...i, amount: Number(i.amount), gstAmount: Number(i.gstAmount) })));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/invoices", async (req, res) => {
  try {
    const { invoiceNumber, projectId, clientName, amount, gstAmount, dueDate } = req.body;
    const [result] = await db.insert(invoices).values({
      invoiceNumber, projectId, clientName,
      amount: amount.toString(),
      gstAmount: gstAmount.toString(),
      dueDate: new Date(dueDate),
      status: "draft",
    }).returning();
    res.status(201).json({ ...result, amount: Number(result.amount) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// PROCUREMENT
app.get("/api/procurement/purchase-orders", async (req, res) => {
  try {
    const result = await db.select().from(purchaseOrders);
    res.json(result.map(po => ({ ...po, amount: Number(po.amount) })));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/procurement/purchase-orders", async (req, res) => {
  try {
    const { poNumber, vendorId, amount, description, orderDate } = req.body;
    const [result] = await db.insert(purchaseOrders).values({
      poNumber, vendorId,
      amount: amount.toString(),
      description,
      orderDate: new Date(orderDate),
      status: "draft",
    }).returning();
    res.status(201).json({ ...result, amount: Number(result.amount) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/procurement/purchase-orders/:id", async (req, res) => {
  try {
    const [result] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, parseInt(req.params.id)));
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ ...result, amount: Number(result.amount) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.patch("/api/procurement/purchase-orders/:id", async (req, res) => {
  try {
    const [result] = await db.update(purchaseOrders)
      .set({ status: req.body.status, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, parseInt(req.params.id)))
      .returning();
    res.json({ ...result, amount: Number(result.amount) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/procurement/stats", async (req, res) => {
  try {
    const allPOs = await db.select().from(purchaseOrders);
    const total = allPOs.reduce((s, po) => s + Number(po.amount), 0);
    res.json({
      total: allPOs.length,
      draft: allPOs.filter(p => p.status === "draft").length,
      pending: allPOs.filter(p => p.status === "pending_approval").length,
      approved: allPOs.filter(p => p.status === "approved").length,
      ordered: allPOs.filter(p => p.status === "ordered").length,
      received: allPOs.filter(p => p.status === "received").length,
      totalValue: total,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// VENDORS
app.get("/api/vendors", async (req, res) => {
  try {
    const result = await db.select().from(vendors);
    res.json(result.map(v => ({ ...v, rating: Number(v.rating || 0) })));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/vendors", async (req, res) => {
  try {
    const { name, gstNumber, email, phone, address } = req.body;
    const [result] = await db.insert(vendors).values({
      name, gstNumber, email, phone, address, rating: "0",
    }).returning();
    res.status(201).json({ ...result, rating: 0 });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/vendors/:id", async (req, res) => {
  try {
    const [result] = await db.select().from(vendors).where(eq(vendors.id, parseInt(req.params.id)));
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ ...result, rating: Number(result.rating || 0) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.patch("/api/vendors/:id", async (req, res) => {
  try {
    const { name, email, phone, address, rating } = req.body;
    const [result] = await db.update(vendors)
      .set({ name, email, phone, address, rating: rating ? rating.toString() : undefined, updatedAt: new Date() })
      .where(eq(vendors.id, parseInt(req.params.id)))
      .returning();
    res.json({ ...result, rating: Number(result.rating || 0) });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// INVENTORY, TENDERS, VEHICLES, HR... (similar pattern)
// Add remaining endpoints following the same structure

// Start
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => logger.info(`Server on :${PORT}`));

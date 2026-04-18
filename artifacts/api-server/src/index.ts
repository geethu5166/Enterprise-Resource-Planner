import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { db, projects, transactions, invoices, vendors, purchaseOrders, materials, stockMovements, tenders, vehicles, maintenanceRecords, fuelLogs, employees, activityLogs } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const logger = pino();
const httpLogger = pinoHttp({ logger });

const app = express();

// Middleware
app.use(httpLogger);
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:18996" }));
app.use(express.json());
app.use(cookieParser());

// Error handler
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// ============ HEALTH ============
app.get("/api/healthz", (req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

// ============ DASHBOARD ============
app.get("/api/dashboard/summary", asyncHandler(async (req: Request, res: Response) => {
  const allProjects = await db.select().from(projects);
  const activeProjects = allProjects.filter(p => p.status === "active");
  const allTransactions = await db.select().from(transactions);
  const allInvoices = await db.select().from(invoices);
  const openTenders = await db.select().from(tenders).where(eq(tenders.status, "open"));
  const maintenanceVehicles = await db.select().from(vehicles).where(eq(vehicles.status, "maintenance"));
  const lowStockMaterials = await db.select().from(materials).where(sql`${materials.quantity}::numeric <= ${materials.minimumStock}::numeric`);
  const pendingPOs = await db.select().from(purchaseOrders).where(eq(purchaseOrders.status, "pending_approval"));
  const allEmployees = await db.select().from(employees).where(eq(employees.status, "active"));

  const totalRevenue = allTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
  const monthlyIncome = allTransactions.filter(t => t.type === "income" && new Date(t.date).getMonth() === new Date().getMonth()).reduce((sum, t) => sum + Number(t.amount), 0);
  const monthlyExpenses = allTransactions.filter(t => t.type === "expense" && new Date(t.date).getMonth() === new Date().getMonth()).reduce((sum, t) => sum + Number(t.amount), 0);
  const pendingInvoices = allInvoices.filter(inv => inv.status !== "paid").reduce((sum, inv) => sum + Number(inv.amount), 0);

  res.json({
    totalProjects: allProjects.length,
    activeProjects: activeProjects.length,
    totalRevenue,
    pendingInvoices,
    openTenders: openTenders.length,
    vehiclesInMaintenance: maintenanceVehicles.length,
    lowStockItems: lowStockMaterials.length,
    pendingPurchaseOrders: pendingPOs.length,
    totalEmployees: allEmployees.length,
    monthlyExpenses,
    monthlyIncome,
  });
}));

app.get("/api/dashboard/recent-activity", asyncHandler(async (req: Request, res: Response) => {
  const activities = await db.select().from(activityLogs).orderBy(sql`${activityLogs.createdAt} DESC`).limit(20);
  res.json(activities.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    module: a.module,
    createdAt: a.createdAt?.toISOString(),
  })));
}));

// ============ PROJECTS ============
app.get("/api/projects", asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const result = status ? await db.select().from(projects).where(eq(projects.status, status as any)) : await db.select().from(projects);
  res.json(result.map(p => ({
    ...p,
    budget: Number(p.budget),
    spent: Number(p.spent),
    startDate: p.startDate?.toISOString(),
    endDate: p.endDate?.toISOString(),
    createdAt: p.createdAt?.toISOString(),
  })));
}));

app.post("/api/projects", asyncHandler(async (req: Request, res: Response) => {
  const { name, code, client, location, status, budget, startDate, endDate, description, projectManager } = req.body;
  const result = await db.insert(projects).values({
    name,
    code,
    client,
    location,
    status: status || "planning",
    budget: budget.toString(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    description,
    projectManager,
    progress: 0,
  }).returning();

  await db.insert(activityLogs).values({
    type: "create",
    module: "projects",
    description: `Created project: ${name}`,
  });

  res.status(201).json({
    ...result[0],
    budget: Number(result[0].budget),
    spent: Number(result[0].spent),
    startDate: result[0].startDate?.toISOString(),
    endDate: result[0].endDate?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
  });
}));

app.get("/api/projects/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(projects).where(eq(projects.id, parseInt(req.params.id)));
  if (!result.length) return res.status(404).json({ error: "Project not found" });
  
  const p = result[0];
  res.json({
    ...p,
    budget: Number(p.budget),
    spent: Number(p.spent),
    startDate: p.startDate?.toISOString(),
    endDate: p.endDate?.toISOString(),
    createdAt: p.createdAt?.toISOString(),
  });
}));

app.patch("/api/projects/:id", asyncHandler(async (req: Request, res: Response) => {
  const { name, status, budget, progress, spent } = req.body;
  const result = await db.update(projects).set({
    name,
    status,
    budget: budget ? budget.toString() : undefined,
    progress,
    spent: spent ? spent.toString() : undefined,
    updatedAt: new Date(),
  }).where(eq(projects.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "Project not found" });

  const p = result[0];
  res.json({
    ...p,
    budget: Number(p.budget),
    spent: Number(p.spent),
    startDate: p.startDate?.toISOString(),
    endDate: p.endDate?.toISOString(),
    createdAt: p.createdAt?.toISOString(),
  });
}));

app.get("/api/projects/stats", asyncHandler(async (req: Request, res: Response) => {
  const allProjects = await db.select().from(projects);
  res.json({
    total: allProjects.length,
    active: allProjects.filter(p => p.status === "active").length,
    completed: allProjects.filter(p => p.status === "completed").length,
    onHold: allProjects.filter(p => p.status === "on_hold").length,
    cancelled: allProjects.filter(p => p.status === "cancelled").length,
  });
}));

// ============ FINANCE ============
app.get("/api/finance/transactions", asyncHandler(async (req: Request, res: Response) => {
  const { type, projectId } = req.query;
  let conditions = [];
  if (type) conditions.push(eq(transactions.type, type as any));
  if (projectId) conditions.push(eq(transactions.projectId, parseInt(projectId as string)));

  const result = conditions.length ? await db.select().from(transactions).where(and(...conditions)) : await db.select().from(transactions);
  res.json(result.map(t => ({
    ...t,
    amount: Number(t.amount),
    gstAmount: Number(t.gstAmount),
    createdAt: t.createdAt?.toISOString(),
    date: t.date?.toISOString(),
  })));
}));

app.post("/api/finance/transactions", asyncHandler(async (req: Request, res: Response) => {
  const { projectId, type, amount, description, date, gstRate } = req.body;
  const gstAmount = (parseFloat(amount) * (gstRate || 0)) / 100;
  
  const result = await db.insert(transactions).values({
    projectId,
    type,
    amount: amount.toString(),
    description,
    date: new Date(date),
    gstAmount: gstAmount.toString(),
    gstRate: gstRate || 0,
  }).returning();

  res.status(201).json({
    ...result[0],
    amount: Number(result[0].amount),
    gstAmount: Number(result[0].gstAmount),
    createdAt: result[0].createdAt?.toISOString(),
    date: result[0].date?.toISOString(),
  });
}));

app.get("/api/finance/summary", asyncHandler(async (req: Request, res: Response) => {
  const allTransactions = await db.select().from(transactions);
  const totalIncome = allTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + parseFloat(t.amount as string), 0);
  const totalExpense = allTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + parseFloat(t.amount as string), 0);
  const totalGST = allTransactions.reduce((sum, t) => sum + parseFloat(t.gstAmount as string), 0);

  res.json({
    totalIncome: Number(totalIncome),
    totalExpense: Number(totalExpense),
    netBalance: Number(totalIncome - totalExpense),
    totalGST: Number(totalGST),
  });
}));

app.get("/api/finance/monthly-cashflow", asyncHandler(async (req: Request, res: Response) => {
  const allTransactions = await db.select().from(transactions);
  const monthlyData: Record<string, { income: number; expense: number }> = {};

  allTransactions.forEach(t => {
    const month = t.date ? new Date(t.date).toISOString().slice(0, 7) : "unknown";
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
    const amount = parseFloat(t.amount as string);
    if (t.type === "income") monthlyData[month].income += amount;
    else monthlyData[month].expense += amount;
  });

  const result = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
    net: data.income - data.expense,
  })).sort((a, b) => a.month.localeCompare(b.month));

  res.json(result);
}));

app.get("/api/finance/invoices", asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const result = status ? await db.select().from(invoices).where(eq(invoices.status, status as any)) : await db.select().from(invoices);
  res.json(result.map(inv => ({
    ...inv,
    amount: Number(inv.amount),
    gstAmount: Number(inv.gstAmount),
    dueDate: inv.dueDate?.toISOString(),
    createdAt: inv.createdAt?.toISOString(),
    updatedAt: inv.updatedAt?.toISOString(),
  })));
}));

app.post("/api/finance/invoices", asyncHandler(async (req: Request, res: Response) => {
  const { invoiceNumber, projectId, clientName, amount, gstAmount, dueDate } = req.body;
  const result = await db.insert(invoices).values({
    invoiceNumber,
    projectId,
    clientName,
    amount: amount.toString(),
    gstAmount: gstAmount.toString(),
    dueDate: new Date(dueDate),
    status: "draft",
  }).returning();

  res.status(201).json({
    ...result[0],
    amount: Number(result[0].amount),
    gstAmount: Number(result[0].gstAmount),
    dueDate: result[0].dueDate?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

// ============ PROCUREMENT ============
app.get("/api/procurement/purchase-orders", asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const result = status ? await db.select().from(purchaseOrders).where(eq(purchaseOrders.status, status as any)) : await db.select().from(purchaseOrders);
  res.json(result.map(po => ({
    ...po,
    amount: Number(po.amount),
    orderDate: po.orderDate?.toISOString(),
    expectedDelivery: po.expectedDelivery?.toISOString(),
    createdAt: po.createdAt?.toISOString(),
    updatedAt: po.updatedAt?.toISOString(),
  })));
}));

app.post("/api/procurement/purchase-orders", asyncHandler(async (req: Request, res: Response) => {
  const { poNumber, vendorId, projectId, amount, description, orderDate, expectedDelivery } = req.body;
  const result = await db.insert(purchaseOrders).values({
    poNumber,
    vendorId,
    projectId,
    amount: amount.toString(),
    description,
    orderDate: new Date(orderDate),
    expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    status: "draft",
  }).returning();

  res.status(201).json({
    ...result[0],
    amount: Number(result[0].amount),
    orderDate: result[0].orderDate?.toISOString(),
    expectedDelivery: result[0].expectedDelivery?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.get("/api/procurement/purchase-orders/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, parseInt(req.params.id)));
  if (!result.length) return res.status(404).json({ error: "PO not found" });
  
  const po = result[0];
  res.json({
    ...po,
    amount: Number(po.amount),
    orderDate: po.orderDate?.toISOString(),
    expectedDelivery: po.expectedDelivery?.toISOString(),
    createdAt: po.createdAt?.toISOString(),
    updatedAt: po.updatedAt?.toISOString(),
  });
}));

app.patch("/api/procurement/purchase-orders/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.update(purchaseOrders).set({
    status: req.body.status,
    updatedAt: new Date(),
  }).where(eq(purchaseOrders.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "PO not found" });

  const po = result[0];
  res.json({
    ...po,
    amount: Number(po.amount),
    orderDate: po.orderDate?.toISOString(),
    expectedDelivery: po.expectedDelivery?.toISOString(),
    createdAt: po.createdAt?.toISOString(),
    updatedAt: po.updatedAt?.toISOString(),
  });
}));

app.get("/api/procurement/stats", asyncHandler(async (req: Request, res: Response) => {
  const allPOs = await db.select().from(purchaseOrders);
  const totalValue = allPOs.reduce((sum, po) => sum + parseFloat(po.amount as string), 0);
  res.json({
    total: allPOs.length,
    draft: allPOs.filter(po => po.status === "draft").length,
    pending: allPOs.filter(po => po.status === "pending_approval").length,
    approved: allPOs.filter(po => po.status === "approved").length,
    ordered: allPOs.filter(po => po.status === "ordered").length,
    received: allPOs.filter(po => po.status === "received").length,
    totalValue: Number(totalValue),
  });
}));

// ============ VENDORS ============
app.get("/api/vendors", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(vendors);
  res.json(result.map(v => ({
    ...v,
    rating: Number(v.rating || 0),
    createdAt: v.createdAt?.toISOString(),
    updatedAt: v.updatedAt?.toISOString(),
  })));
}));

app.post("/api/vendors", asyncHandler(async (req: Request, res: Response) => {
  const { name, gstNumber, email, phone, address, rating } = req.body;
  const result = await db.insert(vendors).values({
    name,
    gstNumber,
    email,
    phone,
    address,
    rating: rating ? rating.toString() : "0",
  }).returning();

  res.status(201).json({
    ...result[0],
    rating: Number(result[0].rating || 0),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.get("/api/vendors/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(vendors).where(eq(vendors.id, parseInt(req.params.id)));
  if (!result.length) return res.status(404).json({ error: "Vendor not found" });
  res.json({
    ...result[0],
    rating: Number(result[0].rating || 0),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.patch("/api/vendors/:id", asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, address, rating } = req.body;
  const result = await db.update(vendors).set({
    name,
    email,
    phone,
    address,
    rating: rating ? rating.toString() : undefined,
    updatedAt: new Date(),
  }).where(eq(vendors.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "Vendor not found" });
  res.json({
    ...result[0],
    rating: Number(result[0].rating || 0),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

// ============ INVENTORY ============
app.get("/api/inventory/materials", asyncHandler(async (req: Request, res: Response) => {
  const { category, lowStock } = req.query;
  let query = db.select().from(materials);
  
  if (category) {
    const result = await query.where(eq(materials.category, category as any));
    return res.json(result.map(m => ({
      ...m,
      quantity: Number(m.quantity),
      minimumStock: Number(m.minimumStock),
      unitPrice: Number(m.unitPrice),
      createdAt: m.createdAt?.toISOString(),
      updatedAt: m.updatedAt?.toISOString(),
    })));
  }
  
  if (lowStock === "true") {
    const result = await query.where(sql`${materials.quantity}::numeric <= ${materials.minimumStock}::numeric`);
    return res.json(result.map(m => ({
      ...m,
      quantity: Number(m.quantity),
      minimumStock: Number(m.minimumStock),
      unitPrice: Number(m.unitPrice),
      createdAt: m.createdAt?.toISOString(),
      updatedAt: m.updatedAt?.toISOString(),
    })));
  }

  const result = await query;
  res.json(result.map(m => ({
    ...m,
    quantity: Number(m.quantity),
    minimumStock: Number(m.minimumStock),
    unitPrice: Number(m.unitPrice),
    createdAt: m.createdAt?.toISOString(),
    updatedAt: m.updatedAt?.toISOString(),
  })));
}));

app.post("/api/inventory/materials", asyncHandler(async (req: Request, res: Response) => {
  const { name, category, unit, quantity, minimumStock, unitPrice } = req.body;
  const result = await db.insert(materials).values({
    name,
    category,
    unit,
    quantity: quantity.toString(),
    minimumStock: minimumStock.toString(),
    unitPrice: unitPrice.toString(),
  }).returning();

  res.status(201).json({
    ...result[0],
    quantity: Number(result[0].quantity),
    minimumStock: Number(result[0].minimumStock),
    unitPrice: Number(result[0].unitPrice),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.patch("/api/inventory/materials/:id", asyncHandler(async (req: Request, res: Response) => {
  const { name, quantity, unitPrice, minimumStock } = req.body;
  const result = await db.update(materials).set({
    name,
    quantity: quantity ? quantity.toString() : undefined,
    unitPrice: unitPrice ? unitPrice.toString() : undefined,
    minimumStock: minimumStock ? minimumStock.toString() : undefined,
    updatedAt: new Date(),
  }).where(eq(materials.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "Material not found" });

  res.json({
    ...result[0],
    quantity: Number(result[0].quantity),
    minimumStock: Number(result[0].minimumStock),
    unitPrice: Number(result[0].unitPrice),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.get("/api/inventory/stock-movements", asyncHandler(async (req: Request, res: Response) => {
  const { materialId } = req.query;
  let query = db.select().from(stockMovements);
  if (materialId) query = query.where(eq(stockMovements.materialId, parseInt(materialId as string)));

  const result = await query;
  res.json(result.map(sm => ({
    ...sm,
    quantity: Number(sm.quantity),
    createdAt: sm.createdAt?.toISOString(),
  })));
}));

app.post("/api/inventory/stock-movements", asyncHandler(async (req: Request, res: Response) => {
  const { materialId, type, quantity, reference } = req.body;
  
  // Update material quantity
  const material = await db.select().from(materials).where(eq(materials.id, materialId));
  if (!material.length) return res.status(404).json({ error: "Material not found" });

  const currentQty = parseFloat(material[0].quantity as string);
  const newQty = type === "inbound" ? currentQty + parseFloat(quantity) : currentQty - parseFloat(quantity);

  await db.update(materials).set({
    quantity: newQty.toString(),
    updatedAt: new Date(),
  }).where(eq(materials.id, materialId));

  const result = await db.insert(stockMovements).values({
    materialId,
    type,
    quantity: quantity.toString(),
    reference,
  }).returning();

  res.status(201).json({
    ...result[0],
    quantity: Number(result[0].quantity),
    createdAt: result[0].createdAt?.toISOString(),
  });
}));

app.get("/api/inventory/summary", asyncHandler(async (req: Request, res: Response) => {
  const allMaterials = await db.select().from(materials);
  const lowStockCount = allMaterials.filter(m => parseFloat(m.quantity as string) <= parseFloat(m.minimumStock as string)).length;
  const totalValue = allMaterials.reduce((sum, m) => sum + (parseFloat(m.quantity as string) * parseFloat(m.unitPrice as string)), 0);

  res.json({
    totalItems: allMaterials.length,
    lowStockItems: lowStockCount,
    totalInventoryValue: Number(totalValue),
  });
}));

// ============ TENDERS ============
app.get("/api/tenders", asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const result = status ? await db.select().from(tenders).where(eq(tenders.status, status as any)) : await db.select().from(tenders);
  res.json(result.map(t => ({
    ...t,
    estimatedValue: Number(t.estimatedValue),
    bidAmount: t.bidAmount ? Number(t.bidAmount) : null,
    deadlineDate: t.deadlineDate?.toISOString(),
    winDate: t.winDate?.toISOString(),
    createdAt: t.createdAt?.toISOString(),
    updatedAt: t.updatedAt?.toISOString(),
  })));
}));

app.post("/api/tenders", asyncHandler(async (req: Request, res: Response) => {
  const { title, description, client, estimatedValue, deadlineDate, bidAmount } = req.body;
  const result = await db.insert(tenders).values({
    title,
    description,
    client,
    estimatedValue: estimatedValue.toString(),
    deadlineDate: new Date(deadlineDate),
    bidAmount: bidAmount ? bidAmount.toString() : null,
    status: "open",
  }).returning();

  res.status(201).json({
    ...result[0],
    estimatedValue: Number(result[0].estimatedValue),
    bidAmount: result[0].bidAmount ? Number(result[0].bidAmount) : null,
    deadlineDate: result[0].deadlineDate?.toISOString(),
    winDate: result[0].winDate?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.get("/api/tenders/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(tenders).where(eq(tenders.id, parseInt(req.params.id)));
  if (!result.length) return res.status(404).json({ error: "Tender not found" });
  const t = result[0];
  res.json({
    ...t,
    estimatedValue: Number(t.estimatedValue),
    bidAmount: t.bidAmount ? Number(t.bidAmount) : null,
    deadlineDate: t.deadlineDate?.toISOString(),
    winDate: t.winDate?.toISOString(),
    createdAt: t.createdAt?.toISOString(),
    updatedAt: t.updatedAt?.toISOString(),
  });
}));

app.patch("/api/tenders/:id", asyncHandler(async (req: Request, res: Response) => {
  const { title, description, bidAmount, status, winDate } = req.body;
  const result = await db.update(tenders).set({
    title,
    description,
    bidAmount: bidAmount ? bidAmount.toString() : undefined,
    status,
    winDate: winDate ? new Date(winDate) : undefined,
    updatedAt: new Date(),
  }).where(eq(tenders.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "Tender not found" });

  const t = result[0];
  res.json({
    ...t,
    estimatedValue: Number(t.estimatedValue),
    bidAmount: t.bidAmount ? Number(t.bidAmount) : null,
    deadlineDate: t.deadlineDate?.toISOString(),
    winDate: t.winDate?.toISOString(),
    createdAt: t.createdAt?.toISOString(),
    updatedAt: t.updatedAt?.toISOString(),
  });
}));

app.get("/api/tenders/stats", asyncHandler(async (req: Request, res: Response) => {
  const allTenders = await db.select().from(tenders);
  const awarded = allTenders.filter(t => t.status === "awarded");
  const winRate = allTenders.length > 0 ? (awarded.length / allTenders.length) * 100 : 0;

  res.json({
    total: allTenders.length,
    open: allTenders.filter(t => t.status === "open").length,
    submitted: allTenders.filter(t => t.status === "submitted").length,
    underEvaluation: allTenders.filter(t => t.status === "under_evaluation").length,
    awarded: awarded.length,
    lost: allTenders.filter(t => t.status === "lost").length,
    winRate: Number(winRate.toFixed(2)),
  });
}));

// ============ VEHICLES ============
app.get("/api/vehicles", asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const result = status ? await db.select().from(vehicles).where(eq(vehicles.status, status as any)) : await db.select().from(vehicles);
  res.json(result.map(v => ({
    ...v,
    fuelCapacity: v.fuelCapacity ? Number(v.fuelCapacity) : null,
    purchaseDate: v.purchaseDate?.toISOString(),
    createdAt: v.createdAt?.toISOString(),
    updatedAt: v.updatedAt?.toISOString(),
  })));
}));

app.post("/api/vehicles", asyncHandler(async (req: Request, res: Response) => {
  const { registrationNumber, model, purchaseDate, fuelCapacity } = req.body;
  const result = await db.insert(vehicles).values({
    registrationNumber,
    model,
    purchaseDate: new Date(purchaseDate),
    fuelCapacity: fuelCapacity ? fuelCapacity.toString() : null,
    status: "available",
  }).returning();

  res.status(201).json({
    ...result[0],
    fuelCapacity: result[0].fuelCapacity ? Number(result[0].fuelCapacity) : null,
    purchaseDate: result[0].purchaseDate?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.get("/api/vehicles/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(vehicles).where(eq(vehicles.id, parseInt(req.params.id)));
  if (!result.length) return res.status(404).json({ error: "Vehicle not found" });
  const v = result[0];
  res.json({
    ...v,
    fuelCapacity: v.fuelCapacity ? Number(v.fuelCapacity) : null,
    purchaseDate: v.purchaseDate?.toISOString(),
    createdAt: v.createdAt?.toISOString(),
    updatedAt: v.updatedAt?.toISOString(),
  });
}));

app.patch("/api/vehicles/:id", asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const result = await db.update(vehicles).set({
    status,
    updatedAt: new Date(),
  }).where(eq(vehicles.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "Vehicle not found" });
  
  const v = result[0];
  res.json({
    ...v,
    fuelCapacity: v.fuelCapacity ? Number(v.fuelCapacity) : null,
    purchaseDate: v.purchaseDate?.toISOString(),
    createdAt: v.createdAt?.toISOString(),
    updatedAt: v.updatedAt?.toISOString(),
  });
}));

app.get("/api/vehicles/maintenance", asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId } = req.query;
  let query = db.select().from(maintenanceRecords);
  if (vehicleId) query = query.where(eq(maintenanceRecords.vehicleId, parseInt(vehicleId as string)));

  const result = await query;
  res.json(result.map(m => ({
    ...m,
    cost: Number(m.cost),
    date: m.date?.toISOString(),
    createdAt: m.createdAt?.toISOString(),
  })));
}));

app.post("/api/vehicles/maintenance", asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId, description, cost, date } = req.body;
  const result = await db.insert(maintenanceRecords).values({
    vehicleId,
    description,
    cost: cost.toString(),
    date: new Date(date),
  }).returning();

  res.status(201).json({
    ...result[0],
    cost: Number(result[0].cost),
    date: result[0].date?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
  });
}));

app.get("/api/vehicles/fuel-logs", asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId } = req.query;
  let query = db.select().from(fuelLogs);
  if (vehicleId) query = query.where(eq(fuelLogs.vehicleId, parseInt(vehicleId as string)));

  const result = await query;
  res.json(result.map(fl => ({
    ...fl,
    quantity: Number(fl.quantity),
    cost: Number(fl.cost),
    date: fl.date?.toISOString(),
    createdAt: fl.createdAt?.toISOString(),
  })));
}));

app.post("/api/vehicles/fuel-logs", asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId, quantity, cost, date } = req.body;
  const result = await db.insert(fuelLogs).values({
    vehicleId,
    quantity: quantity.toString(),
    cost: cost.toString(),
    date: new Date(date),
  }).returning();

  res.status(201).json({
    ...result[0],
    quantity: Number(result[0].quantity),
    cost: Number(result[0].cost),
    date: result[0].date?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
  });
}));

app.get("/api/vehicles/stats", asyncHandler(async (req: Request, res: Response) => {
  const allVehicles = await db.select().from(vehicles);
  res.json({
    total: allVehicles.length,
    available: allVehicles.filter(v => v.status === "available").length,
    inUse: allVehicles.filter(v => v.status === "in_use").length,
    maintenance: allVehicles.filter(v => v.status === "maintenance").length,
    outOfService: allVehicles.filter(v => v.status === "out_of_service").length,
  });
}));

// ============ HR ============
app.get("/api/hr/employees", asyncHandler(async (req: Request, res: Response) => {
  const { department, status: empStatus } = req.query;
  let conditions = [];
  if (department) conditions.push(eq(employees.department, department as string));
  if (empStatus) conditions.push(eq(employees.status, empStatus as any));

  const result = conditions.length ? await db.select().from(employees).where(and(...conditions)) : await db.select().from(employees);
  res.json(result.map(e => ({
    ...e,
    salary: Number(e.salary),
    joinDate: e.joinDate?.toISOString(),
    createdAt: e.createdAt?.toISOString(),
    updatedAt: e.updatedAt?.toISOString(),
  })));
}));

app.post("/api/hr/employees", asyncHandler(async (req: Request, res: Response) => {
  const { name, email, department, designation, salary, joinDate } = req.body;
  const result = await db.insert(employees).values({
    name,
    email,
    department,
    designation,
    salary: salary.toString(),
    joinDate: new Date(joinDate),
    status: "active",
  }).returning();

  res.status(201).json({
    ...result[0],
    salary: Number(result[0].salary),
    joinDate: result[0].joinDate?.toISOString(),
    createdAt: result[0].createdAt?.toISOString(),
    updatedAt: result[0].updatedAt?.toISOString(),
  });
}));

app.get("/api/hr/employees/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await db.select().from(employees).where(eq(employees.id, parseInt(req.params.id)));
  if (!result.length) return res.status(404).json({ error: "Employee not found" });
  const e = result[0];
  res.json({
    ...e,
    salary: Number(e.salary),
    joinDate: e.joinDate?.toISOString(),
    createdAt: e.createdAt?.toISOString(),
    updatedAt: e.updatedAt?.toISOString(),
  });
}));

app.patch("/api/hr/employees/:id", asyncHandler(async (req: Request, res: Response) => {
  const { name, email, department, designation, salary, status: empStatus } = req.body;
  const result = await db.update(employees).set({
    name,
    email,
    department,
    designation,
    salary: salary ? salary.toString() : undefined,
    status: empStatus,
    updatedAt: new Date(),
  }).where(eq(employees.id, parseInt(req.params.id))).returning();

  if (!result.length) return res.status(404).json({ error: "Employee not found" });

  const e = result[0];
  res.json({
    ...e,
    salary: Number(e.salary),
    joinDate: e.joinDate?.toISOString(),
    createdAt: e.createdAt?.toISOString(),
    updatedAt: e.updatedAt?.toISOString(),
  });
}));

app.get("/api/hr/summary", asyncHandler(async (req: Request, res: Response) => {
  const allEmployees = await db.select().from(employees);
  const activeEmployees = allEmployees.filter(e => e.status === "active");
  const totalPayroll = activeEmployees.reduce((sum, e) => sum + parseFloat(e.salary as string), 0);

  res.json({
    totalEmployees: allEmployees.length,
    activeEmployees: activeEmployees.length,
    totalPayroll: Number(totalPayroll),
    averageSalary: activeEmployees.length > 0 ? Number((totalPayroll / activeEmployees.length).toFixed(2)) : 0,
  });
}));

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;

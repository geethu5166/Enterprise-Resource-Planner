import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, purchaseOrdersTable, vendorsTable, projectsTable } from "@workspace/db";
import {
  CreatePurchaseOrderBody,
  UpdatePurchaseOrderBody,
  GetPurchaseOrderParams,
  UpdatePurchaseOrderParams,
  ListPurchaseOrdersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/procurement/purchase-orders", async (req, res): Promise<void> => {
  const query = ListPurchaseOrdersQueryParams.safeParse(req.query);
  const orders = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);
  const vendors = await db.select().from(vendorsTable);
  const projects = await db.select().from(projectsTable);
  let filtered = orders;
  if (query.success && query.data.status) {
    filtered = orders.filter(o => o.status === query.data.status);
  }
  const mapped = filtered.map(o => ({
    ...o,
    totalAmount: Number(o.totalAmount),
    gstAmount: Number(o.gstAmount),
    vendorName: vendors.find(v => v.id === o.vendorId)?.name ?? "Unknown",
    projectName: projects.find(p => p.id === o.projectId)?.name,
    items: Array.isArray(o.items) ? o.items : [],
  }));
  res.json(mapped);
});

router.post("/procurement/purchase-orders", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const count = await db.select().from(purchaseOrdersTable);
  const poNumber = `PO-${new Date().getFullYear()}-${String(count.length + 1).padStart(4, "0")}`;
  const items = parsed.data.items || [];
  const totalAmount = items.reduce((s: number, item: { quantity: number; unitPrice: number }) => s + item.quantity * item.unitPrice, 0);
  const gstAmount = totalAmount * 0.18;
  const itemsWithTotals = items.map((item: { materialName: string; quantity: number; unit: string; unitPrice: number }, idx: number) => ({
    id: idx + 1,
    ...item,
    totalPrice: item.quantity * item.unitPrice,
  }));
  const [order] = await db.insert(purchaseOrdersTable).values({
    poNumber,
    vendorId: parsed.data.vendorId,
    projectId: parsed.data.projectId,
    description: parsed.data.description,
    requiredDate: parsed.data.requiredDate,
    totalAmount: String(totalAmount),
    gstAmount: String(gstAmount),
    items: itemsWithTotals,
  }).returning();
  const vendor = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));
  res.status(201).json({
    ...order,
    totalAmount: Number(order.totalAmount),
    gstAmount: Number(order.gstAmount),
    vendorName: vendor[0]?.name ?? "Unknown",
    items: Array.isArray(order.items) ? order.items : [],
  });
});

router.get("/procurement/stats", async (_req, res): Promise<void> => {
  const orders = await db.select().from(purchaseOrdersTable);
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthValue = orders
    .filter(o => o.createdAt.toISOString().slice(0, 7) === monthStr)
    .reduce((s, o) => s + Number(o.totalAmount), 0);
  res.json({
    totalOrders: orders.length,
    pendingApproval: orders.filter(o => o.status === "pending_approval").length,
    totalValue: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
    thisMonthValue,
  });
});

router.get("/procurement/purchase-orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const vendor = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));
  const project = order.projectId ? await db.select().from(projectsTable).where(eq(projectsTable.id, order.projectId)) : [];
  res.json({
    ...order,
    totalAmount: Number(order.totalAmount),
    gstAmount: Number(order.gstAmount),
    vendorName: vendor[0]?.name ?? "Unknown",
    projectName: project[0]?.name,
    items: Array.isArray(order.items) ? order.items : [],
  });
});

router.patch("/procurement/purchase-orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdatePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(purchaseOrdersTable).set(parsed.data).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const vendor = await db.select().from(vendorsTable).where(eq(vendorsTable.id, updated.vendorId));
  res.json({
    ...updated,
    totalAmount: Number(updated.totalAmount),
    gstAmount: Number(updated.gstAmount),
    vendorName: vendor[0]?.name ?? "Unknown",
    items: Array.isArray(updated.items) ? updated.items : [],
  });
});

export default router;

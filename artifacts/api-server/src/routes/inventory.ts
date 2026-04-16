import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, materialsTable, stockMovementsTable, projectsTable } from "@workspace/db";
import {
  CreateMaterialBody,
  UpdateMaterialBody,
  UpdateMaterialParams,
  CreateStockMovementBody,
  ListMaterialsQueryParams,
  ListStockMovementsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory/materials", async (req, res): Promise<void> => {
  const query = ListMaterialsQueryParams.safeParse(req.query);
  let mats = await db.select().from(materialsTable).orderBy(materialsTable.name);
  if (query.success && query.data.category) {
    mats = mats.filter(m => m.category === query.data.category);
  }
  if (query.success && query.data.lowStock === true) {
    mats = mats.filter(m => Number(m.currentStock) <= Number(m.minimumStock));
  }
  res.json(mats.map(m => ({
    ...m,
    currentStock: Number(m.currentStock),
    minimumStock: Number(m.minimumStock),
    unitCost: Number(m.unitCost),
    totalValue: Number(m.totalValue),
  })));
});

router.post("/inventory/materials", async (req, res): Promise<void> => {
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const totalValue = (Number(parsed.data.currentStock ?? 0)) * Number(parsed.data.unitCost);
  const [mat] = await db.insert(materialsTable).values({
    ...parsed.data,
    currentStock: String(parsed.data.currentStock ?? 0),
    minimumStock: String(parsed.data.minimumStock),
    unitCost: String(parsed.data.unitCost),
    totalValue: String(totalValue),
  }).returning();
  res.status(201).json({
    ...mat,
    currentStock: Number(mat.currentStock),
    minimumStock: Number(mat.minimumStock),
    unitCost: Number(mat.unitCost),
    totalValue: Number(mat.totalValue),
  });
});

router.patch("/inventory/materials/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateMaterialBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.currentStock !== undefined) data.currentStock = String(parsed.data.currentStock);
  if (parsed.data.minimumStock !== undefined) data.minimumStock = String(parsed.data.minimumStock);
  if (parsed.data.unitCost !== undefined) data.unitCost = String(parsed.data.unitCost);
  if (parsed.data.location !== undefined) data.location = parsed.data.location;
  const [updated] = await db.update(materialsTable).set(data).where(eq(materialsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    ...updated,
    currentStock: Number(updated.currentStock),
    minimumStock: Number(updated.minimumStock),
    unitCost: Number(updated.unitCost),
    totalValue: Number(updated.totalValue),
  });
});

router.get("/inventory/stock-movements", async (req, res): Promise<void> => {
  const query = ListStockMovementsQueryParams.safeParse(req.query);
  let movements = await db.select().from(stockMovementsTable).orderBy(stockMovementsTable.createdAt);
  if (query.success && query.data.materialId) {
    movements = movements.filter(m => m.materialId === query.data.materialId);
  }
  const mats = await db.select().from(materialsTable);
  const projects = await db.select().from(projectsTable);
  const mapped = movements.map(m => ({
    ...m,
    quantity: Number(m.quantity),
    materialName: mats.find(mat => mat.id === m.materialId)?.name ?? "Unknown",
    unit: mats.find(mat => mat.id === m.materialId)?.unit ?? "",
    projectName: projects.find(p => p.id === m.projectId)?.name,
  }));
  res.json(mapped);
});

router.post("/inventory/stock-movements", async (req, res): Promise<void> => {
  const parsed = CreateStockMovementBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [movement] = await db.insert(stockMovementsTable).values({
    ...parsed.data,
    quantity: String(parsed.data.quantity),
  }).returning();
  // Update material stock
  const [mat] = await db.select().from(materialsTable).where(eq(materialsTable.id, parsed.data.materialId));
  if (mat) {
    let newStock = Number(mat.currentStock);
    if (parsed.data.type === "in") newStock += Number(parsed.data.quantity);
    else if (parsed.data.type === "out") newStock -= Number(parsed.data.quantity);
    else newStock = Number(parsed.data.quantity);
    const newValue = newStock * Number(mat.unitCost);
    await db.update(materialsTable).set({
      currentStock: String(newStock),
      totalValue: String(newValue),
      lastUpdated: new Date().toISOString().split("T")[0],
    }).where(eq(materialsTable.id, mat.id));
  }
  res.status(201).json({
    ...movement,
    quantity: Number(movement.quantity),
    materialName: mat?.name ?? "Unknown",
    unit: mat?.unit ?? "",
  });
});

router.get("/inventory/summary", async (_req, res): Promise<void> => {
  const mats = await db.select().from(materialsTable);
  const totalValue = mats.reduce((s, m) => s + Number(m.totalValue), 0);
  const lowStockCount = mats.filter(m => Number(m.currentStock) <= Number(m.minimumStock)).length;
  const categories = ["cement", "steel", "sand", "aggregate", "metal", "wood", "electrical", "plumbing", "other"];
  const byCategory = categories.map(cat => ({
    category: cat,
    count: mats.filter(m => m.category === cat).length,
    value: mats.filter(m => m.category === cat).reduce((s, m) => s + Number(m.totalValue), 0),
  })).filter(c => c.count > 0);
  res.json({ totalItems: mats.length, totalValue, lowStockCount, byCategory });
});

export default router;

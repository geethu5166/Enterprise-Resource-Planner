import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import { CreateVendorBody, UpdateVendorBody, GetVendorParams, UpdateVendorParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vendors", async (_req, res): Promise<void> => {
  const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.name);
  res.json(vendors.map(v => ({ ...v, rating: Number(v.rating) })));
});

router.post("/vendors", async (req, res): Promise<void> => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [vendor] = await db.insert(vendorsTable).values(parsed.data).returning();
  res.status(201).json({ ...vendor, rating: Number(vendor.rating) });
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
  if (!vendor) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...vendor, rating: Number(vendor.rating) });
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.rating !== undefined) data.rating = String(parsed.data.rating);
  const [updated] = await db.update(vendorsTable).set(data).where(eq(vendorsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, rating: Number(updated.rating) });
});

export default router;

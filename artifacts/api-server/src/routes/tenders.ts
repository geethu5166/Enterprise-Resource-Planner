import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tendersTable } from "@workspace/db";
import {
  CreateTenderBody,
  UpdateTenderBody,
  GetTenderParams,
  UpdateTenderParams,
  ListTendersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tenders", async (req, res): Promise<void> => {
  const query = ListTendersQueryParams.safeParse(req.query);
  const tenders = await db.select().from(tendersTable).orderBy(tendersTable.createdAt);
  let filtered = tenders;
  if (query.success && query.data.status) {
    filtered = tenders.filter(t => t.status === query.data.status);
  }
  res.json(filtered.map(t => ({
    ...t,
    estimatedValue: Number(t.estimatedValue),
    bidAmount: t.bidAmount ? Number(t.bidAmount) : undefined,
  })));
});

router.post("/tenders", async (req, res): Promise<void> => {
  const parsed = CreateTenderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const count = await db.select().from(tendersTable);
  const tenderNumber = `TND-${new Date().getFullYear()}-${String(count.length + 1).padStart(4, "0")}`;
  const [tender] = await db.insert(tendersTable).values({
    ...parsed.data,
    tenderNumber,
    estimatedValue: String(parsed.data.estimatedValue),
    bidAmount: parsed.data.bidAmount ? String(parsed.data.bidAmount) : null,
  }).returning();
  res.status(201).json({
    ...tender,
    estimatedValue: Number(tender.estimatedValue),
    bidAmount: tender.bidAmount ? Number(tender.bidAmount) : undefined,
  });
});

router.get("/tenders/stats", async (_req, res): Promise<void> => {
  const tenders = await db.select().from(tendersTable);
  const awarded = tenders.filter(t => t.status === "awarded").length;
  const submitted = tenders.filter(t => ["submitted", "under_evaluation", "awarded", "lost"].includes(t.status)).length;
  const successRate = submitted > 0 ? (awarded / submitted) * 100 : 0;
  res.json({
    total: tenders.length,
    open: tenders.filter(t => t.status === "open").length,
    awarded,
    successRate: Math.round(successRate),
    totalBidValue: tenders.reduce((s, t) => s + (t.bidAmount ? Number(t.bidAmount) : 0), 0),
  });
});

router.get("/tenders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, id));
  if (!tender) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...tender, estimatedValue: Number(tender.estimatedValue), bidAmount: tender.bidAmount ? Number(tender.bidAmount) : undefined });
});

router.patch("/tenders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateTenderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.bidAmount !== undefined) data.bidAmount = String(parsed.data.bidAmount);
  const [updated] = await db.update(tendersTable).set(data).where(eq(tendersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, estimatedValue: Number(updated.estimatedValue), bidAmount: updated.bidAmount ? Number(updated.bidAmount) : undefined });
});

export default router;

import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  let q = db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  if (query.success && query.data.status) {
    const results = await db.select().from(projectsTable).where(eq(projectsTable.status, query.data.status));
    const mapped = results.map(p => ({ ...p, budget: Number(p.budget), spent: Number(p.spent) }));
    res.json(mapped);
    return;
  }
  const results = await q;
  const mapped = results.map(p => ({ ...p, budget: Number(p.budget), spent: Number(p.spent) }));
  res.json(mapped);
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    ...parsed.data,
    budget: String(parsed.data.budget),
    spent: "0",
  }).returning();
  res.status(201).json({ ...project, budget: Number(project.budget), spent: Number(project.spent) });
});

router.get("/projects/stats", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const byStatus = ["planning", "active", "on_hold", "completed", "cancelled"].map(status => ({
    status,
    count: projects.filter(p => p.status === status).length,
  }));
  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget), 0);
  const totalSpent = projects.reduce((sum, p) => sum + Number(p.spent), 0);
  res.json({ byStatus, totalBudget, totalSpent });
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...project, budget: Number(project.budget), spent: Number(project.spent) });
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.budget !== undefined) data.budget = String(parsed.data.budget);
  if (parsed.data.spent !== undefined) data.spent = String(parsed.data.spent);
  const [updated] = await db.update(projectsTable).set(data).where(eq(projectsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, budget: Number(updated.budget), spent: Number(updated.spent) });
});

export default router;

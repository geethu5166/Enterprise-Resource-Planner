import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  CreateEmployeeBody,
  UpdateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  ListEmployeesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/hr/employees", async (req, res): Promise<void> => {
  const query = ListEmployeesQueryParams.safeParse(req.query);
  let employees = await db.select().from(employeesTable).orderBy(employeesTable.name);
  if (query.success && query.data.department) {
    employees = employees.filter(e => e.department === query.data.department);
  }
  if (query.success && query.data.status) {
    employees = employees.filter(e => e.status === query.data.status);
  }
  res.json(employees.map(e => ({ ...e, salary: Number(e.salary) })));
});

router.post("/hr/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const count = await db.select().from(employeesTable);
  const employeeId = `EMP-${String(count.length + 1).padStart(4, "0")}`;
  const [employee] = await db.insert(employeesTable).values({
    ...parsed.data,
    employeeId,
    salary: String(parsed.data.salary),
    skills: parsed.data.skills ?? [],
  }).returning();
  res.status(201).json({ ...employee, salary: Number(employee.salary) });
});

router.get("/hr/summary", async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable);
  const active = employees.filter(e => e.status === "active");
  const depts = [...new Set(employees.map(e => e.department))];
  const byDepartment = depts.map(dept => ({
    department: dept,
    count: active.filter(e => e.department === dept).length,
  }));
  res.json({
    totalEmployees: employees.length,
    byDepartment,
    totalPayroll: active.reduce((s, e) => s + Number(e.salary), 0),
    activeCount: active.length,
  });
});

router.get("/hr/employees/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!employee) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...employee, salary: Number(employee.salary) });
});

router.patch("/hr/employees/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.salary !== undefined) data.salary = String(parsed.data.salary);
  const [updated] = await db.update(employeesTable).set(data).where(eq(employeesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, salary: Number(updated.salary) });
});

export default router;

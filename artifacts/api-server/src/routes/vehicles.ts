import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vehiclesTable, maintenanceRecordsTable, fuelLogsTable } from "@workspace/db";
import {
  CreateVehicleBody,
  UpdateVehicleBody,
  ListVehiclesQueryParams,
  CreateMaintenanceRecordBody,
  CreateFuelLogBody,
  ListMaintenanceRecordsQueryParams,
  ListFuelLogsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vehicles", async (req, res): Promise<void> => {
  const query = ListVehiclesQueryParams.safeParse(req.query);
  let vehicles = await db.select().from(vehiclesTable).orderBy(vehiclesTable.createdAt);
  if (query.success && query.data.status) {
    vehicles = vehicles.filter(v => v.status === query.data.status);
  }
  res.json(vehicles.map(v => ({ ...v, odometer: Number(v.odometer) })));
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [vehicle] = await db.insert(vehiclesTable).values({ ...parsed.data, odometer: "0" }).returning();
  res.status(201).json({ ...vehicle, odometer: Number(vehicle.odometer) });
});

router.get("/vehicles/stats", async (_req, res): Promise<void> => {
  const vehicles = await db.select().from(vehiclesTable);
  const maintenance = await db.select().from(maintenanceRecordsTable);
  const fuel = await db.select().from(fuelLogsTable);
  res.json({
    total: vehicles.length,
    available: vehicles.filter(v => v.status === "available").length,
    inUse: vehicles.filter(v => v.status === "in_use").length,
    inMaintenance: vehicles.filter(v => v.status === "maintenance").length,
    totalFuelCost: fuel.reduce((s, f) => s + Number(f.totalCost), 0),
    totalMaintenanceCost: maintenance.reduce((s, m) => s + Number(m.cost), 0),
  });
});

router.get("/vehicles/maintenance", async (req, res): Promise<void> => {
  const query = ListMaintenanceRecordsQueryParams.safeParse(req.query);
  let records = await db.select().from(maintenanceRecordsTable).orderBy(maintenanceRecordsTable.createdAt);
  if (query.success && query.data.vehicleId) {
    records = records.filter(r => r.vehicleId === query.data.vehicleId);
  }
  const vehicles = await db.select().from(vehiclesTable);
  const mapped = records.map(r => ({
    ...r,
    cost: Number(r.cost),
    vehicleRegistration: vehicles.find(v => v.id === r.vehicleId)?.registrationNumber ?? "Unknown",
  }));
  res.json(mapped);
});

router.post("/vehicles/maintenance", async (req, res): Promise<void> => {
  const parsed = CreateMaintenanceRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [record] = await db.insert(maintenanceRecordsTable).values({
    ...parsed.data,
    cost: String(parsed.data.cost),
  }).returning();
  const vehicle = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, record.vehicleId));
  res.status(201).json({
    ...record,
    cost: Number(record.cost),
    vehicleRegistration: vehicle[0]?.registrationNumber ?? "Unknown",
  });
});

router.get("/vehicles/fuel-logs", async (req, res): Promise<void> => {
  const query = ListFuelLogsQueryParams.safeParse(req.query);
  let logs = await db.select().from(fuelLogsTable).orderBy(fuelLogsTable.createdAt);
  if (query.success && query.data.vehicleId) {
    logs = logs.filter(l => l.vehicleId === query.data.vehicleId);
  }
  const vehicles = await db.select().from(vehiclesTable);
  const mapped = logs.map(l => ({
    ...l,
    liters: Number(l.liters),
    costPerLiter: Number(l.costPerLiter),
    totalCost: Number(l.totalCost),
    odometer: Number(l.odometer),
    vehicleRegistration: vehicles.find(v => v.id === l.vehicleId)?.registrationNumber ?? "Unknown",
  }));
  res.json(mapped);
});

router.post("/vehicles/fuel-logs", async (req, res): Promise<void> => {
  const parsed = CreateFuelLogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const totalCost = Number(parsed.data.liters) * Number(parsed.data.costPerLiter);
  const [log] = await db.insert(fuelLogsTable).values({
    ...parsed.data,
    liters: String(parsed.data.liters),
    costPerLiter: String(parsed.data.costPerLiter),
    totalCost: String(totalCost),
    odometer: String(parsed.data.odometer),
  }).returning();
  const vehicle = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, log.vehicleId));
  res.status(201).json({
    ...log,
    liters: Number(log.liters),
    costPerLiter: Number(log.costPerLiter),
    totalCost: Number(log.totalCost),
    odometer: Number(log.odometer),
    vehicleRegistration: vehicle[0]?.registrationNumber ?? "Unknown",
  });
});

router.get("/vehicles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id));
  if (!vehicle) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...vehicle, odometer: Number(vehicle.odometer) });
});

router.patch("/vehicles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.odometer !== undefined) data.odometer = String(parsed.data.odometer);
  const [updated] = await db.update(vehiclesTable).set(data).where(eq(vehiclesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, odometer: Number(updated.odometer) });
});

export default router;

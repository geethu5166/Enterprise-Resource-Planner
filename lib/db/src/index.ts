import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/erp_db",
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export type DB = typeof db;

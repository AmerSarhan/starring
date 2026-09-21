import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL");

/** One pool per function instance; Fluid Compute reuses instances across requests. */
const globalForDb = globalThis as unknown as { __starringPool?: Pool };
const pool =
  globalForDb.__starringPool ??
  new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 8_000 });
globalForDb.__starringPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

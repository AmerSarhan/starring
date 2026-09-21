import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/** One pool per function instance; Fluid Compute reuses instances across requests.
    Created lazily so `next build` can collect page data without a DATABASE_URL. */
const globalForDb = globalThis as unknown as { __starringPool?: Pool };

function pool(): Pool {
  if (!globalForDb.__starringPool) {
    const url = process.env.DATABASE_URL;
    if (!url) console.warn("[db] DATABASE_URL is not set; queries will fail");
    globalForDb.__starringPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return globalForDb.__starringPool;
}

export const db = drizzle({ client: pool(), schema });
export { schema };

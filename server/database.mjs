import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

let pool;
let connection;

export function database() {
  if (!connection) {
    const connectionString =
      process.env.AUTOMATION_DATABASE_URL || "postgresql://automation:automation@127.0.0.1:55432/automation";
    pool = new pg.Pool({ connectionString });
    connection = drizzle(pool);
  }
  return connection;
}

export async function closeDatabase() {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  connection = undefined;
  await current.end();
}

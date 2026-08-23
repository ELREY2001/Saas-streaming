import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL est requis. Vérifie ton fichier .env");
}

const globalForDb = globalThis as typeof globalThis & {
  __accountflowPool?: Pool;
};

export const pool =
  globalForDb.__accountflowPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__accountflowPool = pool;
}

export const db = drizzle(pool);

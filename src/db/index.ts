import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const SUPABASE_DIRECT_URL = "postgresql://postgres:d%24eER45%40dds@db.bejwissofekdfvlzhcwc.supabase.co:5432/postgres?sslmode=require";

// Ensure connectionString always points to Direct Supabase Port 5432
let connectionString = process.env.DATABASE_URL || env.DATABASE_URL || SUPABASE_DIRECT_URL;
if (!connectionString || connectionString.includes("placeholder") || connectionString.includes("pooler.supabase.com") || connectionString.includes(":6543")) {
  connectionString = SUPABASE_DIRECT_URL;
}
if (connectionString.includes("postgres:d@dds@") || connectionString.includes("d$eER45@dds")) {
  connectionString = connectionString
    .replace("postgres:d@dds@", "postgres:d%24eER45%40dds@")
    .replace("d$eER45@dds", "d%24eER45%40dds");
}

// Prevent creating multiple postgres connections during Next.js HMR development reloads
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(connectionString, {
    ssl: "require",
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false, // Disable prepared statements for compatibility with transaction pooler
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });

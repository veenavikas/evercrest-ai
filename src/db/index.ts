import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const SUPABASE_IPV4_POOLER_URL = "postgresql://postgres.bejwissofekdfvlzhcwc:d%24eER45%40dds@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require";

// Ensure connectionString uses IPv4-compatible pooler host on Vercel
let connectionString = process.env.DATABASE_URL || env.DATABASE_URL || SUPABASE_IPV4_POOLER_URL;
if (!connectionString || connectionString.includes("placeholder") || connectionString.includes("db.bejwissofekdfvlzhcwc.supabase.co")) {
  connectionString = SUPABASE_IPV4_POOLER_URL;
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

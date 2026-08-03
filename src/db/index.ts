import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const connectionString = env.DATABASE_URL;

// Prevent creating multiple postgres connections during Next.js HMR development reloads
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(connectionString, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false, // Disable prepared statements for compatibility with transaction pooler
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });

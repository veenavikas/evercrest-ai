import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const connectionString = process.env.DATABASE_URL || "postgres://dsnaidu@localhost:5432/evercrest";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  console.log("Updating dsnaidu@gmail.com and all whitelisted entries to tenant role...");

  // Update allowed_emails
  await db.update(schema.allowedEmails).set({ role: "tenant" });
  console.log("All allowed_emails updated to role='tenant'.");

  // Update dsnaidu@gmail.com in users table to tenant
  await db.update(schema.users).set({ role: "tenant" }).where(eq(schema.users.email, "dsnaidu@gmail.com"));
  console.log("User dsnaidu@gmail.com role set to 'tenant' in users table.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Error updating roles:", err);
  process.exit(1);
});

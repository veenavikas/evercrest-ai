import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL || "postgres://dsnaidu@localhost:5432/evercrest";

async function main() {
  console.log("Running migrations...");
  const migrationClient = postgres(connectionString, { max: 1, ssl: "require", prepare: false });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations applied successfully!");
  
  await migrationClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

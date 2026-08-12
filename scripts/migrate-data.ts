import fs from "fs";
import path from "path";
import postgres from "postgres";

async function run() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const envConfig = fs.readFileSync(envPath, "utf8");
  let targetUrl = "";
  for (const line of envConfig.split("\n")) {
    const match = line.match(/^DATABASE_URL="?(.*)"?$/);
    if (match) {
      targetUrl = match[1].replace(/"/g, "");
    }
  }

  const oldUrl = process.argv[2];
  if (!oldUrl) {
    console.error("Error: Please provide the old database connection URL as an argument.");
    console.error("Usage: npx tsx scripts/migrate-data.ts <OLD_DATABASE_URL>");
    process.exit(1);
  }

  console.log("Connecting to source database...");
  const srcSql = postgres(oldUrl, { ssl: "require", prepare: false, max: 1 });
  
  console.log("Connecting to target database...");
  const dstSql = postgres(targetUrl, { ssl: "require", prepare: false, max: 1 });

  // Tables in dependency order
  const tables = [
    "properties",
    "units",
    "users",
    "allowed_emails",
    "amenities",
    "conversations",
    "amenity_bookings",
    "announcements",
    "directory_entries",
    "documents",
    "messages",
    "work_orders",
    "email_logs",
    "system_logs",
    "ai_usage_logs",
  ];

  for (const table of tables) {
    try {
      console.log(`\nMigrating table: ${table}...`);
      const rows = await srcSql.unsafe(`SELECT * FROM "${table}"`);
      console.log(`  Fetched ${rows.length} rows from source.`);

      if (rows.length === 0) continue;

      // Clean destination table or handle upserts
      for (const row of rows) {
        const keys = Object.keys(row);
        const columns = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const values = keys.map((k) => row[k]);

        // Build UPSERT query using ON CONFLICT (id) DO NOTHING
        const query = `
          INSERT INTO "${table}" (${columns}) 
          VALUES (${placeholders}) 
          ON CONFLICT (id) DO NOTHING
        `;
        await dstSql.unsafe(query, values);
      }
      console.log(`  ✓ Successfully migrated table ${table}.`);
    } catch (err: any) {
      console.warn(`  ! Warning/Skipped ${table}: ${err.message}`);
    }
  }

  // Reset sequences for auto-incrementing serial primary keys
  console.log("\nResetting ID sequences...");
  for (const table of tables) {
    try {
      await dstSql.unsafe(`
        SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}";
      `);
    } catch (err) {
      // Ignore tables without serial id sequence
    }
  }

  console.log("\nMigration completed successfully!");
  await srcSql.end();
  await dstSql.end();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

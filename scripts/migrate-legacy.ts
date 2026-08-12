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
    console.error("Error: Please provide old database connection URL.");
    process.exit(1);
  }

  console.log("Connecting to source database...");
  const srcSql = postgres(oldUrl, { ssl: "require", prepare: false, max: 1 });

  console.log("Connecting to target database...");
  const dstSql = postgres(targetUrl, { ssl: "require", prepare: false, max: 1 });

  // 1. Create chat_token_usage table
  await dstSql`
    CREATE TABLE IF NOT EXISTS "chat_token_usage" (
      "id" serial PRIMARY KEY,
      "conversation_id" text,
      "tenant_email" text,
      "property_address" text,
      "input_tokens" integer,
      "output_tokens" integer,
      "total_tokens" integer,
      "updated_at" timestamp with time zone DEFAULT now()
    );
  `;

  // 2. Create legacy_conversations table
  await dstSql`
    CREATE TABLE IF NOT EXISTS "legacy_conversations" (
      "id" text PRIMARY KEY,
      "tenant_email" text,
      "property_address" text,
      "status" text,
      "token_usage" jsonb,
      "data" jsonb,
      "updated_at" timestamp with time zone DEFAULT now()
    );
  `;

  // 3. Migrate conversations
  console.log("Migrating conversations...");
  const conversations = await srcSql`SELECT * FROM "conversations"`;
  console.log(`Fetched ${conversations.length} conversations.`);

  let countConv = 0;
  for (const conv of conversations) {
    const tokenUsageJson = conv.token_usage ? JSON.stringify(conv.token_usage) : null;
    const dataJson = conv.data ? JSON.stringify(conv.data) : null;
    const updatedAt = conv.updatedAt || new Date();

    await dstSql`
      INSERT INTO "legacy_conversations" ("id", "tenant_email", "property_address", "status", "token_usage", "data", "updated_at")
      VALUES (${conv.id}, ${conv.tenant_email}, ${conv.property_address}, ${conv.status}, ${tokenUsageJson}::jsonb, ${dataJson}::jsonb, ${updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        "tenant_email" = EXCLUDED."tenant_email",
        "property_address" = EXCLUDED."property_address",
        "status" = EXCLUDED."status",
        "token_usage" = EXCLUDED."token_usage",
        "data" = EXCLUDED."data",
        "updated_at" = EXCLUDED."updated_at"
    `;
    countConv++;
  }
  console.log(`✓ Successfully migrated ${countConv} conversations to legacy_conversations.`);

  // 4. Migrate chat_token_usage
  console.log("Migrating chat_token_usage...");
  const tokenUsages = await srcSql`SELECT * FROM "chat_token_usage"`;
  console.log(`Fetched ${tokenUsages.length} token usage records.`);

  let countTokens = 0;
  for (const row of tokenUsages) {
    const updatedAt = row.updated_at || new Date();
    await dstSql`
      INSERT INTO "chat_token_usage" ("conversation_id", "tenant_email", "property_address", "input_tokens", "output_tokens", "total_tokens", "updated_at")
      VALUES (${row.conversation_id}, ${row.tenant_email}, ${row.property_address}, ${row.input_tokens}, ${row.output_tokens}, ${row.total_tokens}, ${updatedAt})
    `;
    countTokens++;
  }
  console.log(`✓ Successfully migrated ${countTokens} token usage records.`);

  console.log("\nLegacy data migration completed successfully!");
  await srcSql.end();
  await dstSql.end();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

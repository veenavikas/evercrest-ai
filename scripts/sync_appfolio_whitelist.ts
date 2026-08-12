import fs from "fs";
import path from "path";
import postgres from "postgres";
import XLSX from "xlsx";

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
const client = postgres(connectionString, { ssl: "require", prepare: false, max: 1 });

type TenantRow = {
  pNum: string;
  address: string;
  name: string;
  phone: string;
  email: string;
};

async function main() {
  console.log("Ensuring database schema columns properties.code and allowed_emails.property_code exist...");
  await client`ALTER TABLE properties ADD COLUMN IF NOT EXISTS code text;`;
  await client`ALTER TABLE allowed_emails ADD COLUMN IF NOT EXISTS property_code text;`;

  console.log("Reading Appfolio email table_1.xlsx...");
  const filePath = path.join(process.cwd(), "Appfolio email table_1.xlsx");
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rawData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  const parsedTenants: TenantRow[] = [];
  rawData.forEach((row) => {
    const pNum = String(row["P#"] || "").trim();
    const address = String(row["Property Address"] || "").trim();

    [1, 2, 3, 4, 5].forEach((tNum) => {
      const nameKey = `Tenant ${tNum} Name`;
      const phoneKey = `Tenant ${tNum} Phone`;
      const emailKey = `Tenant ${tNum} Email`;

      if (row[emailKey]) {
        const rawEmails = String(row[emailKey]).split("|");
        rawEmails.forEach((e) => {
          const cleanEmail = e.trim().toLowerCase();
          if (cleanEmail && cleanEmail.includes("@")) {
            parsedTenants.push({
              pNum,
              address,
              name: String(row[nameKey] || "").trim() || "CrestFix Resident",
              phone: String(row[phoneKey] || "").trim(),
              email: cleanEmail,
            });
          }
        });
      }
    });
  });

  console.log(`Extracted ${parsedTenants.length} tenant email entries from Excel.`);

  // 1. Unique Properties
  const propertyMap = new Map<string, number>();

  for (const tenant of parsedTenants) {
    if (!tenant.address) continue;
    if (propertyMap.has(tenant.address)) continue;

    const parts = tenant.address.split(",");
    const addressLine1 = parts[0]?.trim() || tenant.address;
    const city = parts[1]?.trim() || "Missouri City";
    const stateZip = parts[2]?.trim() || "TX 77489";
    const stateZipParts = stateZip.split(" ");
    const state = stateZipParts[0] || "TX";
    const postalCode = stateZipParts[1] || "77489";
    const slug = tenant.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existingProps = await client`SELECT id FROM "properties" WHERE "address_line1" = ${addressLine1} LIMIT 1`;
    
    let propId: number;
    if (existingProps.length > 0) {
      propId = existingProps[0].id;
      if (tenant.pNum) {
        await client`UPDATE "properties" SET "code" = ${tenant.pNum} WHERE "id" = ${propId}`;
      }
    } else {
      const inserted = await client`
        INSERT INTO "properties" ("name", "code", "slug", "address_line1", "city", "state", "postal_code", "description", "contact_email", "contact_phone", "is_active")
        VALUES (${tenant.address}, ${tenant.pNum}, ${slug}, ${addressLine1}, ${city}, ${state}, ${postalCode}, ${`Residential property ${tenant.pNum}`}, ${tenant.email}, ${tenant.phone || "555-0199"}, true)
        RETURNING id
      `;
      propId = inserted[0].id;
    }
    propertyMap.set(tenant.address, propId);
  }

  console.log(`Processed ${propertyMap.size} properties in DB.`);

  // 2. Batch Upsert Allowed Emails & Tenant Users
  let insertedWhitelist = 0;
  let insertedUsers = 0;

  for (const tenant of parsedTenants) {
    const propId = propertyMap.get(tenant.address) ?? null;
    const username = tenant.email.split("@")[0];

    // Allowed Emails Upsert
    const resAllowed = await client`
      INSERT INTO "allowed_emails" ("email", "role", "property_id", "property_code")
      VALUES (${tenant.email}, 'tenant', ${propId}, ${tenant.pNum})
      ON CONFLICT ("email") DO UPDATE SET
        "property_id" = EXCLUDED."property_id",
        "property_code" = EXCLUDED."property_code",
        "role" = 'tenant'
      RETURNING id
    `;
    if (resAllowed.length > 0) insertedWhitelist++;

    // Tenant Users Upsert
    const resUsers = await client`
      INSERT INTO "users" ("username", "email", "full_name", "role", "property_id")
      VALUES (${username}, ${tenant.email}, ${tenant.name}, 'tenant', ${propId})
      ON CONFLICT ("email") DO UPDATE SET
        "full_name" = EXCLUDED."full_name",
        "property_id" = EXCLUDED."property_id"
      RETURNING id
    `;
    if (resUsers.length > 0) insertedUsers++;
  }

  console.log(`Successfully synced whitelist!\n- Whitelist entries processed: ${parsedTenants.length}\n- Whitelist entries synced: ${insertedWhitelist}\n- Tenant users synced: ${insertedUsers}`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error syncing Appfolio whitelist:", err);
  process.exit(1);
});

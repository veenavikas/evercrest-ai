import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import XLSX from "xlsx";
import path from "path";

const connectionString = process.env.DATABASE_URL || "postgres://dsnaidu@localhost:5432/evercrest";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

type TenantRow = {
  pNum: string;
  address: string;
  name: string;
  phone: string;
  email: string;
};

async function main() {
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
              name: String(row[nameKey] || "").trim() || "Evercrest Resident",
              phone: String(row[phoneKey] || "").trim(),
              email: cleanEmail,
            });
          }
        });
      }
    });
  });

  console.log(`Extracted ${parsedTenants.length} tenant email entries from Excel.`);

  // 1. Group by unique Property Address & insert properties
  const propertyMap = new Map<string, number>();

  for (const tenant of parsedTenants) {
    if (!tenant.address) continue;
    
    if (!propertyMap.has(tenant.address)) {
      // Helper to parse city, state, zip from address
      const parts = tenant.address.split(",");
      const addressLine1 = parts[0]?.trim() || tenant.address;
      const city = parts[1]?.trim() || "Missouri City";
      const stateZip = parts[2]?.trim() || "TX 77489";
      const stateZipParts = stateZip.split(" ");
      const state = stateZipParts[0] || "TX";
      const postalCode = stateZipParts[1] || "77489";

      const [existingProp] = await db.select().from(schema.properties).where(eq(schema.properties.addressLine1, addressLine1));
      
      let propId: number;
      if (existingProp) {
        propId = existingProp.id;
      } else {
        const [newProp] = await db.insert(schema.properties).values({
          name: tenant.address,
          slug: tenant.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          addressLine1,
          city,
          state,
          postalCode,
          description: `Residential single-family / unit property ${tenant.pNum}`,
          contactEmail: tenant.email,
          contactPhone: tenant.phone || "555-0199",
          isActive: true,
        }).returning();
        propId = newProp.id;
      }

      propertyMap.set(tenant.address, propId);
    }
  }

  console.log(`Processed ${propertyMap.size} properties in DB.`);

  // 2. Insert into allowed_emails & users tables
  let insertedWhitelist = 0;
  let insertedUsers = 0;

  for (const tenant of parsedTenants) {
    const propId = propertyMap.get(tenant.address) ?? null;

    // Check allowed_emails
    const [existingAllowed] = await db.select().from(schema.allowedEmails).where(eq(schema.allowedEmails.email, tenant.email));
    if (!existingAllowed) {
      await db.insert(schema.allowedEmails).values({
        email: tenant.email,
        role: "tenant",
        propertyId: propId,
      });
      insertedWhitelist++;
    } else {
      await db.update(schema.allowedEmails).set({
        propertyId: propId,
        role: "tenant",
      }).where(eq(schema.allowedEmails.email, tenant.email));
    }

    // Check users
    const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, tenant.email));
    if (!existingUser) {
      await db.insert(schema.users).values({
        username: tenant.email.split("@")[0],
        email: tenant.email,
        fullName: tenant.name,
        role: "tenant",
        propertyId: propId,
      });
      insertedUsers++;
    } else {
      await db.update(schema.users).set({
        fullName: tenant.name,
        propertyId: propId,
      }).where(eq(schema.users.email, tenant.email));
    }
  }

  console.log(`Successfully synced whitelist!\n- Whitelist entries processed: ${parsedTenants.length}\n- New whitelist entries created: ${insertedWhitelist}\n- New tenant users created: ${insertedUsers}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error syncing Appfolio whitelist:", err);
  process.exit(1);
});

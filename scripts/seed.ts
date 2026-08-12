import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

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
const client = postgres(connectionString, { ssl: "require", prepare: false });
const db = drizzle(client, { schema });

async function main() {
  console.log("Running migration check & seeding database...");

  // 0. Ensure columns exist on users table
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text UNIQUE;`);
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;`);

  // 1. Check if properties exist
  let properties = await db.select().from(schema.properties);
  
  if (properties.length === 0) {
    console.log("Creating default property...");
    const [newProperty] = await db.insert(schema.properties).values({
      name: "Evercrest Grand",
      slug: "evercrest-grand",
      addressLine1: "123 Grand Ave",
      city: "Tech City",
      state: "CA",
      postalCode: "94000",
      description: "A luxury apartment complex with top-tier amenities.",
      contactEmail: "admin@evercrest.com",
      contactPhone: "555-0101",
      isActive: true,
    }).returning();
    properties = [newProperty];
  }

  const defaultProperty = properties[0];

  // 2. Check and add amenities
  const existingAmenities = await db.select().from(schema.amenities);
  if (existingAmenities.length === 0) {
    console.log("Creating default amenities...");
    await db.insert(schema.amenities).values([
      {
        propertyId: defaultProperty.id,
        name: "Fitness Center",
        description: "State of the art gym equipment.",
        openTime: "06:00",
        closeTime: "22:00",
        requiresBooking: true,
        maxCapacity: 10,
        bookingSlotMinutes: 60,
        isActive: true,
      },
      {
        propertyId: defaultProperty.id,
        name: "Swimming Pool",
        description: "Outdoor heated pool.",
        openTime: "08:00",
        closeTime: "20:00",
        requiresBooking: true,
        maxCapacity: 20,
        bookingSlotMinutes: 120,
        isActive: true,
      }
    ]);
  }

  // 3. Ensure Demo Admin exists with valid passwordHash
  const adminEmail = "admin@evercrest.com";
  const hashedPassword = await hashPassword("admin123");

  const [existingAdminUser] = await db.select().from(schema.users).where(eq(schema.users.email, adminEmail));

  if (!existingAdminUser) {
    console.log(`Creating demo admin user (username: admin, email: ${adminEmail})...`);
    await db.insert(schema.users).values({
      username: "admin",
      email: adminEmail,
      fullName: "Evercrest Administrator",
      role: "admin",
      passwordHash: hashedPassword,
      propertyId: null,
    });
  } else {
    console.log("Updating demo admin user password hash...");
    await db.update(schema.users).set({
      username: "admin",
      role: "admin",
      passwordHash: hashedPassword,
    }).where(eq(schema.users.id, existingAdminUser.id));
  }

  // 4. Seed all Appfolio properties & whitelist entries from Excel
  console.log("Seeding Appfolio properties & whitelist entries from Excel into Supabase...");
  const excelPath = path.resolve(process.cwd(), "Appfolio email table_1.xlsx");
  if (fs.existsSync(excelPath)) {
    try {
      const XLSX = require("xlsx");
      const wb = XLSX.readFile(excelPath);
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      const tenants: any[] = [];
      rawData.forEach((row: any) => {
        const pNum = String(row["P#"] || "").trim();
        const address = String(row["Property Address"] || "").trim();
        [1, 2, 3, 4, 5].forEach((tNum) => {
          const email = String(row[`Tenant ${tNum} Email`] || "").trim().toLowerCase();
          const name = String(row[`Tenant ${tNum} Name`] || "").trim() || "Whitelisted Resident";
          const phone = String(row[`Tenant ${tNum} Phone`] || "").trim();
          if (email && email.includes("@")) {
            email.split("|").forEach((e) => {
              const clean = e.trim().toLowerCase();
              if (clean && clean.includes("@")) {
                tenants.push({ pNum, address, name, phone, email: clean });
              }
            });
          }
        });
      });

      const propMap = new Map();
      for (const t of tenants) {
        if (!t.address || propMap.has(t.address)) continue;
        const parts = t.address.split(",");
        const addressLine1 = parts[0]?.trim() || t.address;
        const city = parts[1]?.trim() || "Missouri City";
        const stateZip = parts[2]?.trim() || "TX 77489";
        const stateZipParts = stateZip.split(" ");
        const state = stateZipParts[0] || "TX";
        const postalCode = stateZipParts[1] || "77489";
        const slug = t.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const existing = await client`SELECT id FROM "properties" WHERE "address_line1" = ${addressLine1} LIMIT 1`;
        let id;
        if (existing.length > 0) {
          id = existing[0].id;
          if (t.pNum) await client`UPDATE "properties" SET "code" = ${t.pNum} WHERE id = ${id}`;
        } else {
          const ins = await client`
            INSERT INTO "properties" ("name", "code", "slug", "address_line1", "city", "state", "postal_code", "description", "contact_email", "contact_phone", "is_active")
            VALUES (${t.address}, ${t.pNum}, ${slug}, ${addressLine1}, ${city}, ${state}, ${postalCode}, ${`Property ${t.pNum}`}, ${t.email}, ${t.phone || "555-0199"}, true)
            RETURNING id
          `;
          id = ins[0].id;
        }
        propMap.set(t.address, id);
      }

      for (const t of tenants) {
        const propId = propMap.get(t.address) || null;
        await client`
          INSERT INTO "allowed_emails" ("email", "role", "property_id", "property_code")
          VALUES (${t.email}, 'tenant', ${propId}, ${t.pNum})
          ON CONFLICT ("email") DO UPDATE SET
            "property_id" = EXCLUDED."property_id",
            "property_code" = EXCLUDED."property_code"
        `;

        const username = t.email.split("@")[0];
        await client`
          INSERT INTO "users" ("username", "email", "full_name", "role", "property_id")
          VALUES (${username}, ${t.email}, ${t.name}, 'tenant', ${propId})
          ON CONFLICT ("email") DO UPDATE SET
            "full_name" = EXCLUDED."full_name",
            "property_id" = EXCLUDED."property_id"
        `;
      }
      console.log(`Synced ${propMap.size} properties and ${tenants.length} whitelist emails into Supabase.`);
    } catch (excelErr) {
      console.warn("Skipping Appfolio Excel sync during seed:", excelErr);
    }
  }

  console.log("Database migration & seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});

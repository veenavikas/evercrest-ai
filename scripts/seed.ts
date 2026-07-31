import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL || "postgres://dsnaidu@localhost:5432/evercrest";
const client = postgres(connectionString);
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

  console.log("Database migration & seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});

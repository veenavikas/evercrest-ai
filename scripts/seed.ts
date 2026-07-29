import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import fs from "fs";
import path from "path";

// Initialize DB connection
const connectionString = process.env.DATABASE_URL || "postgres://dsnaidu@localhost:5432/evercrest";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  console.log("Seeding database...");

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

  // 3. Add Admin user to whitelist if not exists
  const adminEmail = "dsnaidu@gmail.com"; 
  const [existingWhitelist] = await db.select().from(schema.allowedEmails).where(eq(schema.allowedEmails.email, adminEmail));
  
  if (!existingWhitelist) {
    console.log(`Adding ${adminEmail} to whitelist as admin...`);
    await db.insert(schema.allowedEmails).values({
      email: adminEmail,
      role: "admin",
      propertyId: null, // Admin for all properties
    });
  } else if (existingWhitelist.role !== "admin") {
     await db.update(schema.allowedEmails).set({ role: "admin", propertyId: null }).where(eq(schema.allowedEmails.email, adminEmail));
  }

  console.log("Database seeding completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});

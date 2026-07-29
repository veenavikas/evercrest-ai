import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import InteractiveLanding from "./components/InteractiveLanding";

export const dynamic = "force-dynamic";

export default async function Home() {
  let activeProperties: any[] = [];
  
  try {
    activeProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.isActive, true));
  } catch (error) {
    console.error("Failed to fetch active properties for landing page:", error);
    // Graceful fallback to empty array so landing page renders cleanly
  }

  return <InteractiveLanding properties={activeProperties} />;
}

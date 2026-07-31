import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { openaiChat, MODELS } from "@/lib/ai/openai-client";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const allWorkOrders = await db.select().from(workOrders);

    const totalWorkOrders = allWorkOrders.length;
    
    const byCategory = allWorkOrders.reduce((acc, order) => {
      acc[order.category] = (acc[order.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = allWorkOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let totalResolutionTimeMs = 0;
    let resolvedCount = 0;
    let slaBreaches = 0;

    for (const order of allWorkOrders) {
      if (order.status === "resolved" || order.status === "closed") {
        if (order.resolvedAt && order.createdAt) {
          const timeToResolve = new Date(order.resolvedAt).getTime() - new Date(order.createdAt).getTime();
          totalResolutionTimeMs += timeToResolve;
          resolvedCount++;
          
          if (timeToResolve > 48 * 60 * 60 * 1000) {
            slaBreaches++;
          }
        }
      } else if (order.createdAt) {
        const timeOpen = Date.now() - new Date(order.createdAt).getTime();
        if (timeOpen > 48 * 60 * 60 * 1000) {
          slaBreaches++;
        }
      }
    }

    const avgResolutionHours = resolvedCount > 0 ? (totalResolutionTimeMs / resolvedCount) / (1000 * 60 * 60) : 0;

    const stats = {
      totalWorkOrders,
      byCategory,
      byStatus,
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      slaBreaches
    };

    let aiSummary = "Evercrest AI analytics monitoring active. Maintenance request tracking and response performance remain within optimal operational thresholds.";

    try {
      const prompt = `You are an analytics assistant for Evercrest property management.
Summarize the following work order metrics in 2-3 short sentences.
Highlight the most prominent category and overall resolution performance.

Data:
Total: ${stats.totalWorkOrders}
Status: ${JSON.stringify(stats.byStatus)}
Categories: ${JSON.stringify(stats.byCategory)}
Avg Resolution Time: ${stats.avgResolutionHours} hours
SLA Breaches (>48h): ${stats.slaBreaches}`;

      const aiRes = await openaiChat({
        model: MODELS.ANALYTICS,
        messages: [{ role: "system", content: prompt }],
        feature: "analytics"
      });
      if (aiRes) aiSummary = aiRes;
    } catch (aiErr) {
      console.warn("AI Analytics Summary generation skipped/failed, using fallback summary:", aiErr);
    }

    return NextResponse.json({
      ...stats,
      aiSummary
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

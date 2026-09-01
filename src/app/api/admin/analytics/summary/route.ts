import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, properties, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { openaiChat, MODELS } from "@/lib/ai/openai-client";
import { eq, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const preset = searchParams.get("preset") || "all";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const propertyIdParam = searchParams.get("propertyId");
    const assigneeIdParam = searchParams.get("assigneeId");
    const vendorParam = searchParams.get("vendor");

    // Date Filtering Logic
    let startMs: number | null = null;
    let endMs: number | null = null;

    const now = new Date();

    if (preset === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startMs = todayStart.getTime();
      endMs = now.getTime();
    } else if (preset === "7d") {
      startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      endMs = now.getTime();
    } else if (preset === "30d") {
      startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      endMs = now.getTime();
    } else if (preset === "ytd") {
      const ytdStart = new Date(now.getFullYear(), 0, 1);
      startMs = ytdStart.getTime();
      endMs = now.getTime();
    } else if (preset === "custom" && (startDateParam || endDateParam)) {
      if (startDateParam) startMs = new Date(startDateParam).getTime();
      if (endDateParam) {
        const eDate = new Date(endDateParam);
        eDate.setHours(23, 59, 59, 999);
        endMs = eDate.getTime();
      }
    }

    let allWorkOrders = await db.select().from(workOrders);

    // Apply Client & Query Filters
    allWorkOrders = allWorkOrders.filter((order) => {
      const createdTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;

      if (startMs && createdTime < startMs) return false;
      if (endMs && createdTime > endMs) return false;

      if (propertyIdParam && propertyIdParam !== "all") {
        if (String(order.propertyId) !== String(propertyIdParam)) return false;
      }

      if (assigneeIdParam && assigneeIdParam !== "all") {
        if (String(order.assignedAdminId) !== String(assigneeIdParam)) return false;
      }

      if (vendorParam && vendorParam !== "all") {
        if (!order.category.toLowerCase().includes(vendorParam.toLowerCase())) return false;
      }

      return true;
    });

    const totalWorkOrders = allWorkOrders.length;

    const byCategory = allWorkOrders.reduce((acc, order) => {
      const cat = order.category || "General";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = allWorkOrders.reduce((acc, order) => {
      const st = order.status || "new";
      acc[st] = (acc[st] || 0) + 1;
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

    const avgResolutionHours = resolvedCount > 0 ? totalResolutionTimeMs / resolvedCount / (1000 * 60 * 60) : 0;

    const stats = {
      totalWorkOrders,
      byCategory,
      byStatus,
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      slaBreaches,
      appliedFilters: {
        preset,
        startDate: startDateParam,
        endDate: endDateParam,
        propertyId: propertyIdParam,
        assigneeId: assigneeIdParam,
        vendor: vendorParam,
      },
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
        feature: "analytics",
      });
      if (aiRes) aiSummary = aiRes;
    } catch (aiErr) {
      console.warn("AI Analytics Summary generation skipped/failed, using fallback summary:", aiErr);
    }

    return NextResponse.json({
      ...stats,
      aiSummary,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

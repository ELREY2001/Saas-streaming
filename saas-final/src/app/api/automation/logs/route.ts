import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { automationActions, subscriptions, clients, sharedAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const logs = await db
      .select({
        id: automationActions.id,
        actionType: automationActions.actionType,
        status: automationActions.status,
        scheduledAt: automationActions.scheduledAt,
        executedAt: automationActions.executedAt,
        result: automationActions.result,
        errorMessage: automationActions.errorMessage,
        createdAt: automationActions.createdAt,
        clientName: clients.name,
        service: sharedAccounts.serviceType,
      })
      .from(automationActions)
      .innerJoin(subscriptions, eq(automationActions.subscriptionId, subscriptions.id))
      .innerJoin(clients, eq(subscriptions.clientId, clients.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(eq(automationActions.adminId, admin.id))
      .orderBy(desc(automationActions.createdAt))
      .limit(limit);

    return NextResponse.json({ logs });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

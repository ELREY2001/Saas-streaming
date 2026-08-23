import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { payments, clients, subscriptions, sharedAccounts } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const allPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        method: payments.method,
        reference: payments.reference,
        paidAt: payments.paidAt,
        notes: payments.notes,
        createdAt: payments.createdAt,
        clientName: clients.name,
        clientPhone: clients.phone,
        service: sharedAccounts.serviceType,
        accountName: sharedAccounts.name,
      })
      .from(payments)
      .innerJoin(clients, eq(payments.clientId, clients.id))
      .innerJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(eq(payments.adminId, admin.id))
      .orderBy(desc(payments.createdAt))
      .limit(limit);

    return NextResponse.json({ payments: allPayments });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, clients, sharedAccounts, payments, notifications } from "@/db/schema";
import { eq, and, lt, gte, lte, count, sum, desc } from "drizzle-orm";

export async function GET() {
  try {
    const admin = await requireAuth();
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Active subscriptions
    const [activeSubsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.adminId, admin.id), eq(subscriptions.status, "active")));

    // Expired subscriptions
    const [expiredSubsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.adminId, admin.id), eq(subscriptions.status, "expired")));

    // Total clients
    const [totalClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.adminId, admin.id));

    // Expiring in 7 days (active)
    const [expiringIn7Result] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.adminId, admin.id),
          eq(subscriptions.status, "active"),
          gte(subscriptions.expiresAt, now),
          lte(subscriptions.expiresAt, in7Days)
        )
      );

    // Expiring in 3 days (critical)
    const [expiringIn3Result] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.adminId, admin.id),
          eq(subscriptions.status, "active"),
          gte(subscriptions.expiresAt, now),
          lte(subscriptions.expiresAt, in3Days)
        )
      );

    // Revenue this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthRevenueResult] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.adminId, admin.id),
          eq(payments.status, "paid"),
          gte(payments.paidAt, startOfMonth)
        )
      );

    // Total revenue
    const [totalRevenueResult] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(eq(payments.adminId, admin.id), eq(payments.status, "paid")));

    // Shared accounts
    const [accountsResult] = await db
      .select({ count: count() })
      .from(sharedAccounts)
      .where(and(eq(sharedAccounts.adminId, admin.id), eq(sharedAccounts.status, "active")));

    // Recent subscriptions expiring soon
    const expiringSoon = await db
      .select({
        id: subscriptions.id,
        clientName: clients.name,
        clientPhone: clients.phone,
        service: sharedAccounts.serviceType,
        accountName: sharedAccounts.name,
        expiresAt: subscriptions.expiresAt,
        price: subscriptions.price,
        currency: subscriptions.currency,
        profileName: subscriptions.profileName,
        status: subscriptions.status,
        reminderSent1Day: subscriptions.reminderSent1Day,
        reminderSent3Days: subscriptions.reminderSent3Days,
      })
      .from(subscriptions)
      .innerJoin(clients, eq(subscriptions.clientId, clients.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(
        and(
          eq(subscriptions.adminId, admin.id),
          eq(subscriptions.status, "active"),
          gte(subscriptions.expiresAt, now),
          lte(subscriptions.expiresAt, in7Days)
        )
      )
      .orderBy(subscriptions.expiresAt)
      .limit(10);

    // Recent payments
    const recentPayments = await db
      .select({
        id: payments.id,
        clientName: clients.name,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        method: payments.method,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(clients, eq(payments.clientId, clients.id))
      .where(eq(payments.adminId, admin.id))
      .orderBy(desc(payments.createdAt))
      .limit(5);

    // Pending notifications
    const [pendingNotifResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.adminId, admin.id), eq(notifications.status, "pending")));

    return NextResponse.json({
      stats: {
        activeSubscriptions: activeSubsResult.count,
        expiredSubscriptions: expiredSubsResult.count,
        totalClients: totalClientsResult.count,
        expiringIn7Days: expiringIn7Result.count,
        expiringIn3Days: expiringIn3Result.count,
        monthRevenue: parseFloat(monthRevenueResult.total || "0"),
        totalRevenue: parseFloat(totalRevenueResult.total || "0"),
        activeAccounts: accountsResult.count,
        pendingNotifications: pendingNotifResult.count,
      },
      expiringSoon,
      recentPayments,
    });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import {
  subscriptions,
  clients,
  sharedAccounts,
  payments,
  notifications,
  settings,
} from "@/db/schema";
import { eq, and, desc, gte, lte, lt } from "drizzle-orm";
import { fillTemplate, DEFAULT_TEMPLATES } from "@/lib/whatsapp";
import { formatDate, formatCurrency } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const filter = searchParams.get("filter") || "";

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const conditions = [eq(subscriptions.adminId, admin.id)];
    if (status && status !== "all") {
      conditions.push(
        eq(subscriptions.status, status as "active" | "expired" | "suspended")
      );
    }
    if (filter === "expiring_soon") {
      conditions.push(gte(subscriptions.expiresAt, now));
      conditions.push(lte(subscriptions.expiresAt, in7Days));
    }
    if (filter === "expired") {
      conditions.push(lt(subscriptions.expiresAt, now));
    }

    const allSubs = await db
      .select({
        id: subscriptions.id,
        clientId: subscriptions.clientId,
        sharedAccountId: subscriptions.sharedAccountId,
        status: subscriptions.status,
        profileName: subscriptions.profileName,
        profilePin: subscriptions.profilePin,
        startDate: subscriptions.startDate,
        expiresAt: subscriptions.expiresAt,
        price: subscriptions.price,
        currency: subscriptions.currency,
        paymentStatus: subscriptions.paymentStatus,
        autoRenew: subscriptions.autoRenew,
        reminderSent1Day: subscriptions.reminderSent1Day,
        reminderSent3Days: subscriptions.reminderSent3Days,
        reminderSent7Days: subscriptions.reminderSent7Days,
        deliveredAt: subscriptions.deliveredAt,
        createdAt: subscriptions.createdAt,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        service: sharedAccounts.serviceType,
        accountName: sharedAccounts.name,
        accountEmail: sharedAccounts.email,
        accountPassword: sharedAccounts.password,
      })
      .from(subscriptions)
      .innerJoin(clients, eq(subscriptions.clientId, clients.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(subscriptions.expiresAt));

    return NextResponse.json({ subscriptions: allSubs });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const body = await req.json();
    const {
      clientId,
      sharedAccountId,
      profileName,
      profilePin,
      startDate,
      expiresAt,
      price,
      currency,
      paymentStatus,
      paymentMethod,
      paymentReference,
      autoDeliver,
    } = body;

    if (!clientId || !sharedAccountId || !expiresAt || !price) {
      return NextResponse.json(
        { error: "Client, compte, date d'expiration et prix requis" },
        { status: 400 }
      );
    }

    // Get client and account details
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    const [account] = await db
      .select()
      .from(sharedAccounts)
      .where(eq(sharedAccounts.id, sharedAccountId))
      .limit(1);

    if (!client || !account) {
      return NextResponse.json({ error: "Client ou compte non trouvé" }, { status: 404 });
    }

    // Check profile availability
    if (account.usedProfiles >= account.maxProfiles) {
      return NextResponse.json(
        { error: "Plus de profils disponibles sur ce compte" },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date();
    const expires = new Date(expiresAt);

    // Create subscription
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        clientId,
        sharedAccountId,
        adminId: admin.id,
        profileName: profileName?.trim() || null,
        profilePin: profilePin?.trim() || null,
        startDate: start,
        expiresAt: expires,
        price: price.toString(),
        currency: currency || "XOF",
        paymentStatus: paymentStatus || "pending",
        status: "active",
      })
      .returning();

    // Update used profiles count
    await db
      .update(sharedAccounts)
      .set({
        usedProfiles: account.usedProfiles + 1,
        updatedAt: new Date(),
      })
      .where(eq(sharedAccounts.id, sharedAccountId));

    // Create payment record if paid
    if (paymentStatus === "paid") {
      await db.insert(payments).values({
        subscriptionId: subscription.id,
        clientId,
        adminId: admin.id,
        amount: price.toString(),
        currency: currency || "XOF",
        status: "paid",
        method: paymentMethod || null,
        reference: paymentReference || null,
        paidAt: new Date(),
      });
    }

    // Auto-deliver if requested
    if (autoDeliver) {
      const [adminSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.adminId, admin.id))
        .limit(1);

      const vars = {
        clientName: client.name,
        service: account.serviceType.toUpperCase(),
        email: account.email,
        password: account.password,
        profileLine: profileName ? `👤 Profil : ${profileName}` : "",
        profilePin: profilePin ? `🔢 PIN : ${profilePin}` : "",
        expiresAt: formatDate(expires),
        amount: formatCurrency(price, currency || "XOF"),
      };

      const template =
        adminSettings?.deliveryMessageTemplate || DEFAULT_TEMPLATES.delivery;
      const message = fillTemplate(template, vars);

      // Save delivery notification
      await db.insert(notifications).values({
        subscriptionId: subscription.id,
        clientId,
        adminId: admin.id,
        channel: "whatsapp",
        message,
        status: "pending",
        metadata: { type: "delivery" } as Record<string, string>,
      });

      // Mark as delivered
      await db
        .update(subscriptions)
        .set({ deliveredAt: new Date(), deliveryMessage: message })
        .where(eq(subscriptions.id, subscription.id));
    }

    // Update client to active
    await db
      .update(clients)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(clients.id, clientId));

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    console.error("Subscription creation error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

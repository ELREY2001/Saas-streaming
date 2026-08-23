import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, sharedAccounts, clients, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;

    const [sub] = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        profileName: subscriptions.profileName,
        profilePin: subscriptions.profilePin,
        startDate: subscriptions.startDate,
        expiresAt: subscriptions.expiresAt,
        price: subscriptions.price,
        currency: subscriptions.currency,
        paymentStatus: subscriptions.paymentStatus,
        deliveryMessage: subscriptions.deliveryMessage,
        deliveredAt: subscriptions.deliveredAt,
        clientId: subscriptions.clientId,
        sharedAccountId: subscriptions.sharedAccountId,
        clientName: clients.name,
        clientPhone: clients.phone,
        service: sharedAccounts.serviceType,
        accountEmail: sharedAccounts.email,
        accountPassword: sharedAccounts.password,
      })
      .from(subscriptions)
      .innerJoin(clients, eq(subscriptions.clientId, clients.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(and(eq(subscriptions.id, id), eq(subscriptions.adminId, admin.id)))
      .limit(1);

    if (!sub) {
      return NextResponse.json({ error: "Abonnement non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ subscription: sub });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const {
      profileName,
      profilePin,
      expiresAt,
      price,
      currency,
      paymentStatus,
      status,
      paymentMethod,
      paymentReference,
    } = body;

    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.adminId, admin.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Abonnement non trouvé" }, { status: 404 });
    }

    const [subscription] = await db
      .update(subscriptions)
      .set({
        profileName: profileName?.trim() || existing.profileName,
        profilePin: profilePin?.trim() || existing.profilePin,
        expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
        price: price?.toString() || existing.price,
        currency: currency || existing.currency,
        paymentStatus: paymentStatus || existing.paymentStatus,
        status: status || existing.status,
        updatedAt: new Date(),
      })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.adminId, admin.id)))
      .returning();

    // If payment status changed to paid, create payment record
    if (paymentStatus === "paid" && existing.paymentStatus !== "paid") {
      await db.insert(payments).values({
        subscriptionId: id,
        clientId: existing.clientId,
        adminId: admin.id,
        amount: (price || existing.price).toString(),
        currency: currency || existing.currency,
        status: "paid",
        method: paymentMethod || null,
        reference: paymentReference || null,
        paidAt: new Date(),
      });
    }

    return NextResponse.json({ subscription });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.adminId, admin.id)))
      .limit(1);

    if (!sub) {
      return NextResponse.json({ error: "Abonnement non trouvé" }, { status: 404 });
    }

    // Decrement used profiles
    const [account] = await db
      .select()
      .from(sharedAccounts)
      .where(eq(sharedAccounts.id, sub.sharedAccountId))
      .limit(1);
    if (account) {
      await db
        .update(sharedAccounts)
        .set({
          usedProfiles: Math.max(0, account.usedProfiles - 1),
          updatedAt: new Date(),
        })
        .where(eq(sharedAccounts.id, sub.sharedAccountId));
    }

    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.adminId, admin.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

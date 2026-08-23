import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { clients, subscriptions, sharedAccounts, payments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAuth();
    const { id } = await params;

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.adminId, admin.id)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    const subs = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        expiresAt: subscriptions.expiresAt,
        startDate: subscriptions.startDate,
        price: subscriptions.price,
        currency: subscriptions.currency,
        paymentStatus: subscriptions.paymentStatus,
        profileName: subscriptions.profileName,
        profilePin: subscriptions.profilePin,
        deliveredAt: subscriptions.deliveredAt,
        service: sharedAccounts.serviceType,
        accountName: sharedAccounts.name,
        accountEmail: sharedAccounts.email,
      })
      .from(subscriptions)
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(eq(subscriptions.clientId, client.id))
      .orderBy(desc(subscriptions.expiresAt));

    const clientPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.clientId, client.id))
      .orderBy(desc(payments.createdAt));

    return NextResponse.json({ client, subscriptions: subs, payments: clientPayments });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, notes, status } = body;

    const [client] = await db
      .update(clients)
      .set({
        name: name?.trim(),
        phone: phone?.trim(),
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        status: status || "active",
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), eq(clients.adminId, admin.id)))
      .returning();

    if (!client) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ client });
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

    await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.adminId, admin.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

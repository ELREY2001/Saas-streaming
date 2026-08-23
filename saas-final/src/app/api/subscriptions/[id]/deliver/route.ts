import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, clients, sharedAccounts, notifications, settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fillTemplate, DEFAULT_TEMPLATES } from "@/lib/whatsapp";
import { formatDate, formatCurrency } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;

    const [sub] = await db
      .select({
        subscription: subscriptions,
        client: clients,
        account: sharedAccounts,
      })
      .from(subscriptions)
      .innerJoin(clients, eq(subscriptions.clientId, clients.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(and(eq(subscriptions.id, id), eq(subscriptions.adminId, admin.id)))
      .limit(1);

    if (!sub) {
      return NextResponse.json({ error: "Abonnement non trouvé" }, { status: 404 });
    }

    const [adminSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.adminId, admin.id))
      .limit(1);

    const { subscription, client, account } = sub;

    const vars = {
      clientName: client.name,
      service: account.serviceType.toUpperCase(),
      email: account.email,
      password: account.password,
      profileLine: subscription.profileName ? `👤 Profil : ${subscription.profileName}` : "",
      profilePin: subscription.profilePin ? `🔢 PIN : ${subscription.profilePin}` : "",
      expiresAt: formatDate(new Date(subscription.expiresAt)),
      amount: formatCurrency(subscription.price, subscription.currency),
    };

    const template = adminSettings?.deliveryMessageTemplate || DEFAULT_TEMPLATES.delivery;
    const message = fillTemplate(template, vars);

    // Save notification
    await db.insert(notifications).values({
      subscriptionId: id,
      clientId: client.id,
      adminId: admin.id,
      channel: "whatsapp",
      message,
      status: "pending",
      metadata: { type: "delivery" } as Record<string, string>,
    });

    // Mark as delivered
    await db
      .update(subscriptions)
      .set({
        deliveredAt: new Date(),
        deliveryMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id));

    // Generate WhatsApp link
    const cleanPhone = client.phone.replace(/\D/g, "");
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({ success: true, message, waLink, clientPhone: client.phone });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

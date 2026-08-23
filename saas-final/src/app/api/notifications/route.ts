import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { notifications, clients, subscriptions, sharedAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";

    const conditions = [eq(notifications.adminId, admin.id)];
    if (status && status !== "all") {
      conditions.push(eq(notifications.status, status));
    }

    const notifs = await db
      .select({
        id: notifications.id,
        channel: notifications.channel,
        message: notifications.message,
        status: notifications.status,
        sentAt: notifications.sentAt,
        createdAt: notifications.createdAt,
        metadata: notifications.metadata,
        clientName: clients.name,
        clientPhone: clients.phone,
        service: sharedAccounts.serviceType,
      })
      .from(notifications)
      .innerJoin(clients, eq(notifications.clientId, clients.id))
      .innerJoin(subscriptions, eq(notifications.subscriptionId, subscriptions.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(100);

    // Add WhatsApp links
    const notifsWithLinks = notifs.map((n) => ({
      ...n,
      waLink: buildWhatsAppLink(n.clientPhone, n.message),
    }));

    return NextResponse.json({ notifications: notifsWithLinks });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

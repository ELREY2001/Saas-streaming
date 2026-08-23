import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { notifications, clients, settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { buildWhatsAppLink, sendViaApi } from "@/lib/whatsapp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;

    const [notif] = await db
      .select({
        notification: notifications,
        clientPhone: clients.phone,
        clientName: clients.name,
      })
      .from(notifications)
      .innerJoin(clients, eq(notifications.clientId, clients.id))
      .where(and(eq(notifications.id, id), eq(notifications.adminId, admin.id)))
      .limit(1);

    if (!notif) {
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }

    // Get admin settings (WhatsApp API)
    const [adminSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.adminId, admin.id))
      .limit(1);

    const waLink = buildWhatsAppLink(notif.clientPhone, notif.notification.message);
    let apiResult = null;

    // Try to send via API if configured
    if (adminSettings?.whatsappApiKey && adminSettings?.whatsappPhoneNumber) {
      apiResult = await sendViaApi(
        adminSettings.whatsappApiKey,
        adminSettings.whatsappPhoneNumber,
        notif.clientPhone,
        notif.notification.message
      );
    }

    // Update notification status
    await db
      .update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notifications.id, id));

    return NextResponse.json({
      success: true,
      waLink,
      apiResult,
      message: notif.notification.message,
    });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

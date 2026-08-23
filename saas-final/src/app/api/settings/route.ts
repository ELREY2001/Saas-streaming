import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";

export async function GET() {
  try {
    const admin = await requireAuth();

    let [adminSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.adminId, admin.id))
      .limit(1);

    // Create default settings if none exist
    if (!adminSettings) {
      [adminSettings] = await db
        .insert(settings)
        .values({
          adminId: admin.id,
          defaultCurrency: "XOF",
          reminderDaysBefore: 3,
          autoActionOnExpiry: true,
          defaultExpiryAction: "suspend_access",
          messageTemplate1Day: DEFAULT_TEMPLATES.reminder1Day,
          messageTemplate3Days: DEFAULT_TEMPLATES.reminder3Days,
          messageTemplate7Days: DEFAULT_TEMPLATES.reminder7Days,
          deliveryMessageTemplate: DEFAULT_TEMPLATES.delivery,
        })
        .returning();
    }

    return NextResponse.json({ settings: adminSettings });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.adminId, admin.id))
      .limit(1);

    if (!existing) {
      const [newSettings] = await db
        .insert(settings)
        .values({
          adminId: admin.id,
          ...body,
        })
        .returning();
      return NextResponse.json({ settings: newSettings });
    }

    const [updated] = await db
      .update(settings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(settings.adminId, admin.id))
      .returning();

    return NextResponse.json({ settings: updated });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

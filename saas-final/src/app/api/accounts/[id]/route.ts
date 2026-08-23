import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { sharedAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { name, serviceType, email, password, maxProfiles, status, notes } = body;

    const [account] = await db
      .update(sharedAccounts)
      .set({
        name: name?.trim(),
        serviceType,
        email: email?.trim(),
        password: password?.trim(),
        maxProfiles: maxProfiles || 5,
        status: status || "active",
        notes: notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(sharedAccounts.id, id), eq(sharedAccounts.adminId, admin.id)))
      .returning();

    if (!account) {
      return NextResponse.json({ error: "Compte non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ account });
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
      .delete(sharedAccounts)
      .where(and(eq(sharedAccounts.id, id), eq(sharedAccounts.adminId, admin.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

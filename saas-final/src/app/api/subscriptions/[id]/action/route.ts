import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { triggerManualAction } from "@/lib/automation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth();
    const { id } = await params;
    const { actionType } = await req.json();

    if (!actionType) {
      return NextResponse.json({ error: "Type d'action requis" }, { status: 400 });
    }

    const result = await triggerManualAction(id, actionType, admin.id);
    return NextResponse.json(result);
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

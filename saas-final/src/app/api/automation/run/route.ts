import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runAutomationCycle } from "@/lib/automation";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const result = await runAutomationCycle(admin.id);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

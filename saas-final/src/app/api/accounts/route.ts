import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { sharedAccounts, subscriptions } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get("service") || "";

    const conditions = [eq(sharedAccounts.adminId, admin.id)];
    if (serviceType && serviceType !== "all") {
      conditions.push(
        eq(
          sharedAccounts.serviceType,
          serviceType as
            | "netflix"
            | "spotify"
            | "disney"
            | "amazon"
            | "crunchyroll"
            | "youtube"
            | "other"
        )
      );
    }

    const accounts = await db
      .select()
      .from(sharedAccounts)
      .where(and(...conditions))
      .orderBy(desc(sharedAccounts.createdAt));

    // Add active subscription count for each account
    const accountsWithCount = await Promise.all(
      accounts.map(async (acc) => {
        const [{ count: activeCount }] = await db
          .select({ count: count() })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.sharedAccountId, acc.id),
              eq(subscriptions.status, "active")
            )
          );
        return { ...acc, activeSubscriptions: activeCount };
      })
    );

    return NextResponse.json({ accounts: accountsWithCount });
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
    const { name, serviceType, email, password, maxProfiles, notes } = body;

    if (!name || !serviceType || !email || !password) {
      return NextResponse.json(
        { error: "Nom, service, email et mot de passe requis" },
        { status: 400 }
      );
    }

    const [account] = await db
      .insert(sharedAccounts)
      .values({
        adminId: admin.id,
        name: name.trim(),
        serviceType,
        email: email.trim(),
        password: password.trim(),
        maxProfiles: maxProfiles || 5,
        usedProfiles: 0,
        status: "active",
        notes: notes?.trim() || null,
      })
      .returning();

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

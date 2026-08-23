import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { clients, subscriptions, sharedAccounts } from "@/db/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const conditions = [eq(clients.adminId, admin.id)];
    if (status && status !== "all") {
      conditions.push(eq(clients.status, status as "active" | "expired" | "suspended"));
    }

    let query = db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
        status: clients.status,
        notes: clients.notes,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(and(...conditions))
      .orderBy(desc(clients.createdAt));

    const allClients = await query;

    // Filter by search (name or phone)
    const filtered = search
      ? allClients.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.includes(search)
        )
      : allClients;

    // Get subscription counts
    const clientsWithSubs = await Promise.all(
      filtered.map(async (client) => {
        const subs = await db
          .select({
            id: subscriptions.id,
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
            service: sharedAccounts.serviceType,
            accountName: sharedAccounts.name,
          })
          .from(subscriptions)
          .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
          .where(eq(subscriptions.clientId, client.id))
          .orderBy(desc(subscriptions.expiresAt));

        return { ...client, subscriptions: subs };
      })
    );

    return NextResponse.json({ clients: clientsWithSubs });
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
    const { name, phone, email, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    const [client] = await db
      .insert(clients)
      .values({
        adminId: admin.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        status: "active",
      })
      .returning();

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    if (String(err).includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

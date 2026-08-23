import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  admins,
  clients,
  sharedAccounts,
  subscriptions,
  payments,
  settings,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";

export async function POST() {
  try {
    // Get admin
    const [admin] = await db.select().from(admins).limit(1);
    if (!admin) {
      return NextResponse.json({ error: "No admin found" }, { status: 404 });
    }

    // Seed settings
    const [existingSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.adminId, admin.id))
      .limit(1);

    if (!existingSettings) {
      await db.insert(settings).values({
        adminId: admin.id,
        defaultCurrency: "XOF",
        reminderDaysBefore: 3,
        autoActionOnExpiry: true,
        defaultExpiryAction: "suspend_access",
        messageTemplate1Day: DEFAULT_TEMPLATES.reminder1Day,
        messageTemplate3Days: DEFAULT_TEMPLATES.reminder3Days,
        messageTemplate7Days: DEFAULT_TEMPLATES.reminder7Days,
        deliveryMessageTemplate: DEFAULT_TEMPLATES.delivery,
      });
    }

    // Seed shared accounts
    const existingAccounts = await db
      .select()
      .from(sharedAccounts)
      .where(eq(sharedAccounts.adminId, admin.id));

    let accountIds: string[] = [];

    if (existingAccounts.length === 0) {
      const newAccounts = await db
        .insert(sharedAccounts)
        .values([
          {
            adminId: admin.id,
            name: "Netflix Premium",
            serviceType: "netflix" as const,
            email: "netflix.compte1@gmail.com",
            password: "Netflix@2024!",
            maxProfiles: 4,
            usedProfiles: 0,
            status: "active" as const,
            notes: "Compte 4K Ultra HD",
          },
          {
            adminId: admin.id,
            name: "Spotify Family",
            serviceType: "spotify" as const,
            email: "spotify.family@gmail.com",
            password: "Spotify@2024!",
            maxProfiles: 6,
            usedProfiles: 0,
            status: "active" as const,
            notes: "Abonnement famille 6 comptes",
          },
          {
            adminId: admin.id,
            name: "Disney+ Standard",
            serviceType: "disney" as const,
            email: "disney.plus@gmail.com",
            password: "Disney@2024!",
            maxProfiles: 4,
            usedProfiles: 0,
            status: "active" as const,
          },
        ])
        .returning();
      accountIds = newAccounts.map((a) => a.id);
    } else {
      accountIds = existingAccounts.map((a) => a.id);
    }

    // Seed clients
    const existingClients = await db
      .select()
      .from(clients)
      .where(eq(clients.adminId, admin.id));

    let clientIds: string[] = [];

    if (existingClients.length === 0) {
      const newClients = await db
        .insert(clients)
        .values([
          {
            adminId: admin.id,
            name: "Amadou Diallo",
            phone: "+221771234567",
            email: "amadou@email.com",
            status: "active" as const,
            notes: "Client fidèle depuis 6 mois",
          },
          {
            adminId: admin.id,
            name: "Fatou Ndiaye",
            phone: "+221782345678",
            email: "fatou@email.com",
            status: "active" as const,
          },
          {
            adminId: admin.id,
            name: "Oumar Traoré",
            phone: "+221793456789",
            status: "active" as const,
            notes: "Abonnement Netflix + Spotify",
          },
          {
            adminId: admin.id,
            name: "Aissatou Ba",
            phone: "+221764567890",
            status: "active" as const,
          },
          {
            adminId: admin.id,
            name: "Mamadou Koné",
            phone: "+221755678901",
            status: "active" as const,
          },
        ])
        .returning();
      clientIds = newClients.map((c) => c.id);
    } else {
      clientIds = existingClients.map((c) => c.id);
    }

    // Seed subscriptions
    const existingSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.adminId, admin.id));

    if (existingSubs.length === 0 && clientIds.length > 0 && accountIds.length > 0) {
      const now = new Date();

      const subData = [
        {
          clientId: clientIds[0],
          sharedAccountId: accountIds[0],
          profileName: "Amadou",
          startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days left
          price: "3000",
          paymentStatus: "paid" as const,
          deliveredAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        },
        {
          clientId: clientIds[1],
          sharedAccountId: accountIds[0],
          profileName: "Fatou",
          startDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days left - URGENT
          price: "3000",
          paymentStatus: "paid" as const,
          deliveredAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        },
        {
          clientId: clientIds[2],
          sharedAccountId: accountIds[1],
          profileName: "Oumar",
          startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // EXPIRED
          price: "2500",
          paymentStatus: "paid" as const,
          deliveredAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        },
        {
          clientId: clientIds[3],
          sharedAccountId: accountIds[2],
          profileName: "Aissatou",
          startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days left
          price: "2000",
          paymentStatus: "paid" as const,
          deliveredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          clientId: clientIds[4],
          sharedAccountId: accountIds[1],
          profileName: "Mamadou",
          startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000), // 29 days left
          price: "2500",
          paymentStatus: "pending" as const,
        },
      ];

      for (let i = 0; i < subData.length; i++) {
        const s = subData[i];
        const status = s.expiresAt < now ? "expired" : "active";
        const [sub] = await db
          .insert(subscriptions)
          .values({
            clientId: s.clientId,
            sharedAccountId: s.sharedAccountId,
            adminId: admin.id,
            profileName: s.profileName,
            startDate: s.startDate,
            expiresAt: s.expiresAt,
            price: s.price,
            currency: "XOF",
            paymentStatus: s.paymentStatus,
            status: status as "active" | "expired",
            deliveredAt: s.deliveredAt,
          })
          .returning();

        // Update used profiles
        await db
          .update(sharedAccounts)
          .set({ usedProfiles: i + 1 })
          .where(eq(sharedAccounts.id, s.sharedAccountId));

        // Create payment record for paid subs
        if (s.paymentStatus === "paid") {
          await db.insert(payments).values({
            subscriptionId: sub.id,
            clientId: s.clientId,
            adminId: admin.id,
            amount: s.price,
            currency: "XOF",
            status: "paid",
            method: i % 2 === 0 ? "Mobile Money" : "Cash",
            paidAt: s.startDate,
          });
        }

        // Update client status based on sub
        await db
          .update(clients)
          .set({ status: status as "active" | "expired" })
          .where(eq(clients.id, s.clientId));
      }
    }

    return NextResponse.json({ success: true, message: "Données de démonstration créées" });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

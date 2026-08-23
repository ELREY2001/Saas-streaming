import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  clients,
  sharedAccounts,
  subscriptions,
  payments,
  notifications,
  settings,
  admins,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fillTemplate, DEFAULT_TEMPLATES, sendViaApi } from "@/lib/whatsapp";
import { formatDate, formatCurrency } from "@/lib/utils";

const MAKETOU_API_URL = "https://api.maketou.net";
const MAKETOU_API_KEY = process.env.MAKETOU_API_KEY!;

// Stockage temporaire des paniers en attente (en mémoire)
// Dans un vrai système, utiliser une table DB
const pendingCarts: Map<string, {
  cartId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  service: string;
  accountId: string;
  adminId: string;
  createdAt: Date;
}> = new Map();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, clientName, clientPhone, clientEmail, service, accountId, adminId } = body;

    // Enregistrer le panier en attente
    pendingCarts.set(cartId, {
      cartId,
      clientName,
      clientPhone,
      clientEmail,
      service,
      accountId,
      adminId,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const processed: string[] = [];
    const errors: string[] = [];

    // Récupérer le premier admin (pour le moment on a un seul admin)
    const [admin] = await db.select().from(admins).limit(1);
    if (!admin) {
      return NextResponse.json({ error: "Aucun admin trouvé" }, { status: 404 });
    }

    // Vérifier chaque panier en attente
    for (const [cartId, cartData] of pendingCarts.entries()) {
      try {
        // Vérifier le statut du panier sur Maketou
        const response = await fetch(
          `${MAKETOU_API_URL}/api/v1/stores/cart/${cartId}`,
          {
            headers: {
              Authorization: `Bearer ${MAKETOU_API_KEY}`,
            },
          }
        );

        if (!response.ok) continue;

        const cart = await response.json();

        // Si le panier est payé
        if (cart.status === "paid" || cart.paymentStatus === "paid") {
          // Créer le client
          const [client] = await db
            .insert(clients)
            .values({
              adminId: admin.id,
              name: cartData.clientName,
              phone: cartData.clientPhone,
              email: cartData.clientEmail,
              status: "active",
              notes: `Commande Maketou #${cartId}`,
            })
            .returning();

          // Récupérer le compte partagé disponible
          const [account] = await db
            .select()
            .from(sharedAccounts)
            .where(
              and(
                eq(sharedAccounts.id, cartData.accountId),
                eq(sharedAccounts.status, "active")
              )
            )
            .limit(1);

          if (!account || account.usedProfiles >= account.maxProfiles) {
            errors.push(`Pas de profil disponible pour panier ${cartId}`);
            continue;
          }

          // Créer l'abonnement (30 jours)
          const startDate = new Date();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const [subscription] = await db
            .insert(subscriptions)
            .values({
              clientId: client.id,
              sharedAccountId: account.id,
              adminId: admin.id,
              startDate,
              expiresAt,
              price: cart.amount?.toString() || "0",
              currency: "XOF",
              paymentStatus: "paid",
              status: "active",
              deliveredAt: new Date(),
            })
            .returning();

          // Mettre à jour les profils utilisés
          await db
            .update(sharedAccounts)
            .set({ usedProfiles: account.usedProfiles + 1, updatedAt: new Date() })
            .where(eq(sharedAccounts.id, account.id));

          // Créer le paiement
          await db.insert(payments).values({
            subscriptionId: subscription.id,
            clientId: client.id,
            adminId: admin.id,
            amount: cart.amount?.toString() || "0",
            currency: "XOF",
            status: "paid",
            method: "maketou",
            reference: cartId,
            paidAt: new Date(),
          });

          // Récupérer les paramètres WhatsApp
          const [adminSettings] = await db
            .select()
            .from(settings)
            .where(eq(settings.adminId, admin.id))
            .limit(1);

          // Préparer et envoyer le message WhatsApp
          const vars = {
            clientName: client.name,
            service: account.serviceType.toUpperCase(),
            email: account.email,
            password: account.password,
            profileLine: "",
            profilePin: "",
            expiresAt: formatDate(expiresAt),
            amount: formatCurrency(cart.amount || 0, "XOF"),
          };

          const template =
            adminSettings?.deliveryMessageTemplate || DEFAULT_TEMPLATES.delivery;
          const message = fillTemplate(template, vars);

          // Sauvegarder la notification
          await db.insert(notifications).values({
            subscriptionId: subscription.id,
            clientId: client.id,
            adminId: admin.id,
            channel: "whatsapp",
            message,
            status: "pending",
            metadata: { type: "delivery", cartId } as Record<string, string>,
          });

          // Envoyer via WhatsApp si configuré
          if (adminSettings?.whatsappApiKey && adminSettings?.whatsappPhoneNumber) {
            await sendViaApi(
              adminSettings.whatsappApiKey,
              adminSettings.whatsappPhoneNumber,
              client.phone,
              message
            );
          }

          // Supprimer le panier traité
          pendingCarts.delete(cartId);
          processed.push(cartId);
        }

        // Supprimer les paniers de plus de 24h (expirés)
        const hoursDiff = (new Date().getTime() - cartData.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
          pendingCarts.delete(cartId);
        }

      } catch (err) {
        errors.push(`Erreur panier ${cartId}: ${err}`);
      }
    }

    return NextResponse.json({
      processed: processed.length,
      pending: pendingCarts.size,
      errors,
    });
  } catch (err) {
    console.error("Check payments error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

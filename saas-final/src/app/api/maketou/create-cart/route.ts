import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, sharedAccounts } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

const MAKETOU_API_URL = "https://api.maketou.net";
const MAKETOU_API_KEY = process.env.MAKETOU_API_KEY!;
const MAKETOU_PRODUCT_ID = process.env.MAKETOU_PRODUCT_ID!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, service } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: "Nom, prénom, email et numéro WhatsApp requis" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 }
      );
    }

    // Vérifier qu'il y a des profils disponibles
    const [account] = await db
      .select()
      .from(sharedAccounts)
      .where(
        and(
          eq(sharedAccounts.serviceType, service || "netflix"),
          eq(sharedAccounts.status, "active")
        )
      )
      .limit(1);

    if (!account || account.usedProfiles >= account.maxProfiles) {
      return NextResponse.json(
        { error: "Aucun profil disponible pour le moment. Revenez plus tard." },
        { status: 400 }
      );
    }

    // Créer le panier Maketou
    const response = await fetch(
      `${MAKETOU_API_URL}/api/v1/stores/cart/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MAKETOU_API_KEY}`,
        },
        body: JSON.stringify({
          productDocumentId: MAKETOU_PRODUCT_ID,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          metadata: {
            clientName: `${firstName.trim()} ${lastName.trim()}`,
            clientEmail: email.trim(),
            clientPhone: phone.trim(),
            service: service || "netflix",
            accountId: account.id,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Maketou error:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: "Erreur lors de la création du panier" },
        { status: 500 }
      );
    }

    // Log complet de la réponse pour identifier la structure exacte renvoyée par Maketou
    console.log("Maketou success response:", JSON.stringify(data, null, 2));

    // Structure Maketou observée: { cart: { id, status, customerInfo, ... }, redirectUrl }
    const cartId = data.cart?.id || data.id || data.cartId || data._id;
    const checkoutUrl =
      data.redirectUrl ||
      data.checkoutUrl ||
      data.checkout_url ||
      data.url ||
      data.paymentUrl ||
      data.payment_url ||
      data.paymentLink ||
      data.payment_link ||
      data.redirect_url ||
      data.link;

    if (!checkoutUrl) {
      console.error("Aucune URL de paiement trouvée dans la réponse Maketou:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: "Réponse Maketou invalide (URL de paiement manquante)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cartId,
      checkoutUrl,
    });
  } catch (err) {
    console.error("Create cart error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

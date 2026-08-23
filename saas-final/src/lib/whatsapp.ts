/**
 * WhatsApp notification service
 * Supports wa.me deep links (manual) and optional WhatsApp Business API
 */

export interface WhatsAppMessage {
  to: string; // phone with country code, e.g. "22101234567"
  message: string;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

// Default message templates
export const DEFAULT_TEMPLATES = {
  delivery: `✅ *Accès livré !*

Bonjour {{clientName}} 👋

Votre abonnement *{{service}}* est actif !

🔑 *Identifiants :*
📧 Email : {{email}}
🔒 Mot de passe : {{password}}
{{profileLine}}
📅 Expire le : *{{expiresAt}}*
💰 Montant payé : {{amount}}

Merci pour votre confiance ! 🙏
Pour tout problème, contactez-nous.`,

  reminder7Days: `⏰ *Rappel d'abonnement*

Bonjour {{clientName}} 👋

Votre abonnement *{{service}}* expire dans *7 jours* ({{expiresAt}}).

💡 Renouvelez maintenant pour garder votre accès sans interruption.

💰 Tarif : {{amount}}

Répondez à ce message pour renouveler. 🔄`,

  reminder3Days: `⚠️ *Abonnement bientôt expiré*

Bonjour {{clientName}} 👋

Votre abonnement *{{service}}* expire dans *3 jours* ({{expiresAt}}) !

🚨 Renouvelez rapidement pour éviter la coupure.

💰 Tarif : {{amount}}

Contactez-nous maintenant ! 📞`,

  reminder1Day: `🚨 *URGENT - Expiration demain !*

Bonjour {{clientName}} 👋

Votre abonnement *{{service}}* expire DEMAIN ({{expiresAt}}) !

⚡ Renouvelez MAINTENANT pour ne pas perdre votre accès.

💰 Tarif : {{amount}}

⚠️ Sans renouvellement, votre accès sera coupé automatiquement.`,

  expired: `❌ *Abonnement expiré*

Bonjour {{clientName}} 👋

Votre abonnement *{{service}}* a expiré le {{expiresAt}}.

Votre accès a été suspendu.

Pour renouveler votre abonnement, contactez-nous.

💰 Tarif : {{amount}}`,
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || "");
  }
  return msg;
}

// Optional: WhatsApp Business API via Green API or similar
export async function sendViaApi(
  apiKey: string,
  instanceId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Green API (popular for WhatsApp automation)
    const cleanPhone = phone.replace(/\D/g, "");
    const chatId = cleanPhone.includes("@") ? cleanPhone : `${cleanPhone}@c.us`;

    const response = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

"use client";

import { useState } from "react";

export default function OrderPage() {
  const [step, setStep] = useState<"form" | "loading" | "redirect" | "error">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    // Valider le format de l'email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Adresse email invalide");
      return;
    }

    // Valider le format du numéro
    const phoneClean = phone.replace(/\s/g, "").replace(/^\+/, "");
    if (!/^\d{8,15}$/.test(phoneClean)) {
      setError("Numéro de téléphone invalide (ex: 22969006558)");
      return;
    }

    setError("");
    setStep("loading");

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const res = await fetch("/api/maketou/create-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phoneClean,
          service: "netflix",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création de la commande");
        setStep("form");
        return;
      }

      if (!data.checkoutUrl) {
        setError("Réponse invalide du service de paiement. Réessayez.");
        setStep("form");
        return;
      }

      // Sauvegarder le cartId pour vérification future
      await fetch("/api/maketou/check-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: data.cartId,
          clientName: fullName,
          clientPhone: phoneClean,
          clientEmail: email.trim(),
          service: "netflix",
        }),
      });

      setStep("redirect");

      // Rediriger vers Maketou pour le paiement
      setTimeout(() => {
        window.location.href = data.checkoutUrl;
      }, 2000);

    } catch (err) {
      setError("Erreur de connexion. Réessayez.");
      setStep("form");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0d1b2a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "40px",
        width: "100%",
        maxWidth: "440px",
        backdropFilter: "blur(10px)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "12px",
          }}>🎬</div>
          <h1 style={{
            color: "#fff",
            fontSize: "24px",
            fontWeight: "700",
            margin: "0 0 8px 0",
          }}>Abonnement Netflix</h1>
          <p style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "14px",
            margin: 0,
          }}>Premium 4K · 30 jours · Accès immédiat</p>
        </div>

        {/* Prix */}
        <div style={{
          background: "rgba(229, 9, 20, 0.15)",
          border: "1px solid rgba(229, 9, 20, 0.3)",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center",
          marginBottom: "28px",
        }}>
          <div style={{ color: "#e50914", fontSize: "32px", fontWeight: "800" }}>
            3 000 FCFA
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "4px" }}>
            par mois · Paiement Mobile Money
          </div>
        </div>

        {step === "form" && (
          <>
            {/* Formulaire */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  display: "block",
                  marginBottom: "8px",
                }}>Nom *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Dupont"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  display: "block",
                  marginBottom: "8px",
                }}>Prénom *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Jean"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                display: "block",
                marginBottom: "8px",
              }}>Adresse email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: jean.dupont@gmail.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "12px",
                margin: "6px 0 0 0",
              }}>Requis pour le paiement</p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                display: "block",
                marginBottom: "8px",
              }}>Numéro WhatsApp * (avec indicatif pays)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 22969006558"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "12px",
                margin: "6px 0 0 0",
              }}>Vos identifiants seront envoyés sur ce numéro après paiement</p>
            </div>

            {error && (
              <div style={{
                background: "rgba(255, 59, 48, 0.15)",
                border: "1px solid rgba(255, 59, 48, 0.3)",
                borderRadius: "8px",
                padding: "12px",
                color: "#ff3b30",
                fontSize: "13px",
                marginBottom: "16px",
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #e50914, #b20710)",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Commander maintenant →
            </button>

            {/* Garanties */}
            <div style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}>
              {["✅ Accès immédiat", "🔒 Paiement sécurisé", "📱 Via WhatsApp"].map((item) => (
                <div key={item} style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "11px",
                  textAlign: "center",
                }}>{item}</div>
              ))}
            </div>
          </>
        )}

        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
            <p style={{ color: "#fff", fontSize: "16px" }}>Préparation de votre commande...</p>
          </div>
        )}

        {step === "redirect" && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🚀</div>
            <p style={{ color: "#fff", fontSize: "16px", fontWeight: "600" }}>
              Commande créée !
            </p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
              Vous allez être redirigé vers la page de paiement...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

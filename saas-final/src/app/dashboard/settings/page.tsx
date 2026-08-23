"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Settings, Bell, Zap, MessageCircle, Save, CheckCircle } from "lucide-react";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";

interface AdminSettings {
  id: string;
  whatsappApiKey: string | null;
  whatsappPhoneNumber: string | null;
  defaultCurrency: string;
  reminderDaysBefore: number;
  autoActionOnExpiry: boolean;
  defaultExpiryAction: string;
  messageTemplate1Day: string | null;
  messageTemplate3Days: string | null;
  messageTemplate7Days: string | null;
  deliveryMessageTemplate: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    whatsappApiKey: "",
    whatsappPhoneNumber: "",
    defaultCurrency: "XOF",
    reminderDaysBefore: 3,
    autoActionOnExpiry: true,
    defaultExpiryAction: "suspend_access",
    messageTemplate1Day: DEFAULT_TEMPLATES.reminder1Day,
    messageTemplate3Days: DEFAULT_TEMPLATES.reminder3Days,
    messageTemplate7Days: DEFAULT_TEMPLATES.reminder7Days,
    deliveryMessageTemplate: DEFAULT_TEMPLATES.delivery,
  });

  async function loadSettings() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.settings) {
      setSettings(data.settings);
      setForm({
        whatsappApiKey: data.settings.whatsappApiKey || "",
        whatsappPhoneNumber: data.settings.whatsappPhoneNumber || "",
        defaultCurrency: data.settings.defaultCurrency || "XOF",
        reminderDaysBefore: data.settings.reminderDaysBefore || 3,
        autoActionOnExpiry: data.settings.autoActionOnExpiry ?? true,
        defaultExpiryAction: data.settings.defaultExpiryAction || "suspend_access",
        messageTemplate1Day:
          data.settings.messageTemplate1Day || DEFAULT_TEMPLATES.reminder1Day,
        messageTemplate3Days:
          data.settings.messageTemplate3Days || DEFAULT_TEMPLATES.reminder3Days,
        messageTemplate7Days:
          data.settings.messageTemplate7Days || DEFAULT_TEMPLATES.reminder7Days,
        deliveryMessageTemplate:
          data.settings.deliveryMessageTemplate || DEFAULT_TEMPLATES.delivery,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Paramètres" subtitle="Configuration de la plateforme" />

      <div className="p-6 space-y-6 max-w-4xl">
        {saved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Paramètres enregistrés avec succès !</span>
          </div>
        )}

        {/* WhatsApp Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageCircle size={16} className="text-green-600" />
            </div>
            <h2 className="font-bold text-gray-900">Configuration WhatsApp</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800 font-medium mb-1">
                📱 Envoi WhatsApp automatique (optionnel)
              </p>
              <p className="text-xs text-green-700">
                Configurez Green API ou laissez vide pour utiliser les liens wa.me manuels.
                Les messages s'ouvriront dans WhatsApp Web automatiquement.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Clé API WhatsApp (Green API)"
                type="password"
                value={form.whatsappApiKey}
                onChange={(e) => setForm({ ...form, whatsappApiKey: e.target.value })}
                placeholder="Votre clé API..."
                hint="Optionnel - pour envoi automatique"
              />
              <Input
                label="Instance ID / Numéro expéditeur"
                value={form.whatsappPhoneNumber}
                onChange={(e) => setForm({ ...form, whatsappPhoneNumber: e.target.value })}
                placeholder="Instance ID"
                hint="ID de votre instance Green API"
              />
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Zap size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-bold text-gray-900">Automatisation</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Devise par défaut"
              value={form.defaultCurrency}
              onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
            >
              <option value="XOF">FCFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
              <option value="MAD">Dirham (MAD)</option>
            </Select>
            <Input
              label="Rappel N jours avant (défaut)"
              type="number"
              min={1}
              max={30}
              value={form.reminderDaysBefore}
              onChange={(e) =>
                setForm({ ...form, reminderDaysBefore: parseInt(e.target.value) || 3 })
              }
            />
            <Select
              label="Action à l'expiration"
              value={form.defaultExpiryAction}
              onChange={(e) => setForm({ ...form, defaultExpiryAction: e.target.value })}
            >
              <option value="suspend_access">🔒 Suspendre l'accès</option>
              <option value="delete_profile">🗑️ Supprimer le profil</option>
              <option value="change_password">🔄 Changer le mot de passe</option>
            </Select>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <input
                type="checkbox"
                id="autoAction"
                checked={form.autoActionOnExpiry}
                onChange={(e) => setForm({ ...form, autoActionOnExpiry: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <label htmlFor="autoAction" className="text-sm text-gray-700 cursor-pointer">
                <span className="font-medium">Action automatique à l'expiration</span>
                <br />
                <span className="text-xs text-gray-500">Exécution sans intervention manuelle</span>
              </label>
            </div>
          </div>
        </div>

        {/* Message Templates */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bell size={16} className="text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-900">Modèles de messages</h2>
          </div>

          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-medium">
              Variables disponibles :
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {["{{clientName}}", "{{service}}", "{{email}}", "{{password}}", "{{profileLine}}", "{{expiresAt}}", "{{amount}}"].map(
                (v) => (
                  <code key={v} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    {v}
                  </code>
                )
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Textarea
              label="📦 Message de livraison (après paiement)"
              value={form.deliveryMessageTemplate}
              onChange={(e) => setForm({ ...form, deliveryMessageTemplate: e.target.value })}
              rows={8}
            />
            <Textarea
              label="📅 Rappel 7 jours avant expiration"
              value={form.messageTemplate7Days}
              onChange={(e) => setForm({ ...form, messageTemplate7Days: e.target.value })}
              rows={6}
            />
            <Textarea
              label="⚠️ Rappel 3 jours avant expiration"
              value={form.messageTemplate3Days}
              onChange={(e) => setForm({ ...form, messageTemplate3Days: e.target.value })}
              rows={6}
            />
            <Textarea
              label="🚨 Rappel 1 jour avant expiration"
              value={form.messageTemplate1Day}
              onChange={(e) => setForm({ ...form, messageTemplate1Day: e.target.value })}
              rows={6}
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          loading={saving}
          size="lg"
          icon={<Save size={18} />}
          className="w-full"
        >
          Enregistrer tous les paramètres
        </Button>
      </div>
    </div>
  );
}

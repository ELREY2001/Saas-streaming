"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  CreditCard,
  MessageCircle,
  Send,
  Trash2,
  Zap,
  CheckCircle,
  Eye,
  EyeOff,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  daysUntilExpiry,
  getExpiryBadgeColor,
  getServiceIcon,
} from "@/lib/utils";
import { Suspense } from "react";

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface SharedAccount {
  id: string;
  name: string;
  serviceType: string;
  usedProfiles: number;
  maxProfiles: number;
}

interface Subscription {
  id: string;
  clientId: string;
  sharedAccountId: string;
  status: string;
  profileName: string | null;
  profilePin: string | null;
  startDate: string;
  expiresAt: string;
  price: string;
  currency: string;
  paymentStatus: string;
  autoRenew: boolean;
  reminderSent1Day: boolean;
  reminderSent3Days: boolean;
  reminderSent7Days: boolean;
  deliveredAt: string | null;
  createdAt: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  service: string;
  accountName: string;
  accountEmail: string;
  accountPassword: string;
}

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState<string | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<{
    message: string;
    waLink: string;
    clientPhone: string;
  } | null>(null);
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [actionModal, setActionModal] = useState<Subscription | null>(null);
  const [selectedAction, setSelectedAction] = useState("suspend_access");
  const [runningAction, setRunningAction] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    sharedAccountId: "",
    profileName: "",
    profilePin: "",
    startDate: new Date().toISOString().slice(0, 10),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    price: "",
    currency: "XOF",
    paymentStatus: "paid",
    paymentMethod: "",
    paymentReference: "",
    autoDeliver: true,
  });

  async function loadAll() {
    const [subsRes, clientsRes, accountsRes] = await Promise.all([
      fetch(`/api/subscriptions?filter=${filter}`),
      fetch("/api/clients"),
      fetch("/api/accounts"),
    ]);
    const [subsData, clientsData, accountsData] = await Promise.all([
      subsRes.json(),
      clientsRes.json(),
      accountsRes.json(),
    ]);
    setSubscriptions(subsData.subscriptions || []);
    setClients(clientsData.clients || []);
    setAccounts(accountsData.accounts || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [filter]);

  async function handleSave() {
    if (!form.clientId || !form.sharedAccountId || !form.expiresAt || !form.price) return;
    setSaving(true);
    try {
      await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeliver(sub: Subscription) {
    setDelivering(sub.id);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/deliver`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDeliveryResult({ message: data.message, waLink: data.waLink, clientPhone: data.clientPhone });
        loadAll();
      }
    } finally {
      setDelivering(null);
    }
  }

  async function handleAction() {
    if (!actionModal) return;
    setRunningAction(true);
    try {
      await fetch(`/api/subscriptions/${actionModal.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: selectedAction }),
      });
      setActionModal(null);
      loadAll();
    } finally {
      setRunningAction(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet abonnement ?")) return;
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    loadAll();
  }

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "danger"> = {
      paid: "success",
      pending: "warning",
      failed: "danger",
    };
    const labels: Record<string, string> = { paid: "Payé", pending: "En attente", failed: "Échoué" };
    return <Badge variant={variants[status] || "neutral"}>{labels[status] || status}</Badge>;
  };

  return (
    <div>
      <Header
        title="Abonnements"
        subtitle={`${subscriptions.length} abonnements`}
        actions={
          <Button onClick={() => setShowModal(true)} icon={<Plus size={16} />}>
            Nouvel abonnement
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tous" },
            { key: "expiring_soon", label: "⚠️ Expire bientôt" },
            { key: "expired", label: "❌ Expirés" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <CreditCard size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun abonnement</p>
            <Button className="mt-4" onClick={() => setShowModal(true)} icon={<Plus size={16} />}>
              Créer un abonnement
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Client", "Service", "Profil", "Expiration", "Prix", "Paiement", "Livré", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscriptions.map((sub) => {
                    const daysLeft = daysUntilExpiry(sub.expiresAt);
                    const showPass = showPasswords[sub.id];
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.clientName}</p>
                            <a
                              href={`https://wa.me/${sub.clientPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                            >
                              <MessageCircle size={11} />
                              {sub.clientPhone}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{getServiceIcon(sub.service)}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sub.accountName}</p>
                              <p className="text-xs text-gray-500">{sub.accountEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {sub.profileName ? (
                            <div>
                              <p className="text-sm text-gray-900">{sub.profileName}</p>
                              {sub.profilePin && (
                                <p className="text-xs text-gray-500">PIN: {sub.profilePin}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getExpiryBadgeColor(daysLeft)}`}
                            >
                              {daysLeft <= 0 ? "Expiré" : `J-${daysLeft}`}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(sub.expiresAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(sub.price, sub.currency)}
                          </p>
                        </td>
                        <td className="px-4 py-3">{getPaymentBadge(sub.paymentStatus)}</td>
                        <td className="px-4 py-3">
                          {sub.deliveredAt ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle size={12} />
                              {formatDate(sub.deliveredAt)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Non livré</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeliver(sub)}
                              disabled={delivering === sub.id}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Livrer via WhatsApp"
                            >
                              {delivering === sub.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Send size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setActionModal(sub);
                                setSelectedAction("suspend_access");
                              }}
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Déclencher une action"
                            >
                              <Zap size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvel abonnement"
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Client"
            required
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="col-span-2"
          >
            <option value="">Sélectionner un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.phone}
              </option>
            ))}
          </Select>
          <Select
            label="Compte partagé"
            required
            value={form.sharedAccountId}
            onChange={(e) => setForm({ ...form, sharedAccountId: e.target.value })}
            className="col-span-2"
          >
            <option value="">Sélectionner un compte</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id} disabled={a.usedProfiles >= a.maxProfiles}>
                {getServiceIcon(a.serviceType)} {a.name} ({a.usedProfiles}/{a.maxProfiles} profils)
              </option>
            ))}
          </Select>
          <Input
            label="Nom du profil"
            value={form.profileName}
            onChange={(e) => setForm({ ...form, profileName: e.target.value })}
            placeholder="ex: Profil 1"
          />
          <Input
            label="PIN du profil"
            value={form.profilePin}
            onChange={(e) => setForm({ ...form, profilePin: e.target.value })}
            placeholder="ex: 1234"
          />
          <Input
            label="Date de début"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            icon={<Calendar size={14} />}
          />
          <Input
            label="Date d'expiration"
            type="date"
            required
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            icon={<Calendar size={14} />}
          />
          <Input
            label="Prix"
            type="number"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="3000"
          />
          <Select
            label="Devise"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="XOF">FCFA (XOF)</option>
            <option value="EUR">Euro (EUR)</option>
            <option value="USD">Dollar (USD)</option>
            <option value="MAD">Dirham (MAD)</option>
          </Select>
          <Select
            label="Statut paiement"
            value={form.paymentStatus}
            onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
          >
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
          </Select>
          <Input
            label="Mode paiement"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            placeholder="Mobile Money, Cash..."
          />
          <div className="col-span-2 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <input
              type="checkbox"
              id="autoDeliver"
              checked={form.autoDeliver}
              onChange={(e) => setForm({ ...form, autoDeliver: e.target.checked })}
              className="w-4 h-4 rounded accent-green-600"
            />
            <label htmlFor="autoDeliver" className="text-sm text-green-800 font-medium cursor-pointer">
              📲 Préparer automatiquement la livraison WhatsApp
            </label>
          </div>
          <div className="col-span-2 flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Créer l&apos;abonnement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delivery Result Modal */}
      {deliveryResult && (
        <Modal
          isOpen={!!deliveryResult}
          onClose={() => setDeliveryResult(null)}
          title="✅ Message de livraison prêt"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Aperçu du message WhatsApp</p>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                {deliveryResult.message}
              </pre>
            </div>
            <a
              href={deliveryResult.waLink}
              target="_blank"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <MessageCircle size={18} />
              Envoyer via WhatsApp
            </a>
            <Button
              variant="secondary"
              onClick={() => setDeliveryResult(null)}
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        </Modal>
      )}

      {/* Action Modal */}
      {actionModal && (
        <Modal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={`Action sur ${actionModal.clientName}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sélectionnez l&apos;action à exécuter pour l&apos;abonnement{" "}
              <strong>{actionModal.accountName}</strong>
            </p>
            <Select
              label="Type d'action"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="suspend_access">🔒 Suspendre l&apos;accès</option>
              <option value="delete_profile">🗑️ Supprimer le profil</option>
              <option value="change_password">🔄 Changer le mot de passe</option>
            </Select>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs text-orange-700">
                ⚠️ Cette action sera loggée et une notification WhatsApp sera préparée pour le
                client.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setActionModal(null)} className="flex-1">
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={handleAction}
                loading={runningAction}
                icon={<Zap size={15} />}
                className="flex-1"
              >
                Exécuter
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SubscriptionsContent />
    </Suspense>
  );
}

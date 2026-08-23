"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, Key, Trash2, Edit, Eye, EyeOff, Users, Lock } from "lucide-react";
import { getServiceGradient, getServiceIcon } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SharedAccount {
  id: string;
  name: string;
  serviceType: string;
  email: string;
  password: string;
  maxProfiles: number;
  usedProfiles: number;
  status: string;
  notes: string | null;
  createdAt: string;
  activeSubscriptions: number;
}

const SERVICE_TYPES = [
  { value: "netflix", label: "Netflix" },
  { value: "spotify", label: "Spotify" },
  { value: "disney", label: "Disney+" },
  { value: "amazon", label: "Amazon Prime" },
  { value: "crunchyroll", label: "Crunchyroll" },
  { value: "youtube", label: "YouTube Premium" },
  { value: "other", label: "Autre" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SharedAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: "",
    serviceType: "netflix",
    email: "",
    password: "",
    maxProfiles: 5,
    notes: "",
    status: "active",
  });

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function openCreate() {
    setEditingAccount(null);
    setForm({
      name: "",
      serviceType: "netflix",
      email: "",
      password: "",
      maxProfiles: 5,
      notes: "",
      status: "active",
    });
    setShowModal(true);
  }

  function openEdit(account: SharedAccount) {
    setEditingAccount(account);
    setForm({
      name: account.name,
      serviceType: account.serviceType,
      email: account.email,
      password: account.password,
      maxProfiles: account.maxProfiles,
      notes: account.notes || "",
      status: account.status,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : "/api/accounts";
      const method = editingAccount ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      loadAccounts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce compte partagé ?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  }

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <Header
        title="Comptes partagés"
        subtitle={`${accounts.length} comptes configurés`}
        actions={
          <Button onClick={openCreate} icon={<Plus size={16} />}>
            Nouveau compte
          </Button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Key size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun compte partagé</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez vos premiers comptes Netflix, Spotify, etc.
            </p>
            <Button className="mt-4" onClick={openCreate} icon={<Plus size={16} />}>
              Ajouter un compte
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const usagePercent = Math.round(
                (account.usedProfiles / account.maxProfiles) * 100
              );
              const isFull = account.usedProfiles >= account.maxProfiles;
              const showPass = showPasswords[account.id];

              return (
                <div
                  key={account.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header with gradient */}
                  <div
                    className={`bg-gradient-to-r ${getServiceGradient(account.serviceType)} p-5`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-3xl">
                          {getServiceIcon(account.serviceType)}
                        </span>
                        <h3 className="text-white font-bold mt-2 text-lg">{account.name}</h3>
                        <p className="text-white/70 text-xs capitalize">{account.serviceType}</p>
                      </div>
                      <Badge
                        variant={account.status === "active" ? "success" : "danger"}
                        className="bg-white/20 text-white border-white/30"
                      >
                        {account.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                    {/* Credentials */}
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-mono text-gray-900 truncate">
                          {account.email}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">Mot de passe</p>
                          <p className="text-sm font-mono text-gray-900">
                            {showPass ? account.password : "••••••••••"}
                          </p>
                        </div>
                        <button
                          onClick={() => togglePassword(account.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Profile usage */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Users size={13} />
                          <span>
                            {account.usedProfiles}/{account.maxProfiles} profils
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isFull ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {isFull ? "Complet" : `${account.maxProfiles - account.usedProfiles} libre(s)`}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            usagePercent >= 100
                              ? "bg-red-500"
                              : usagePercent >= 75
                              ? "bg-orange-500"
                              : "bg-green-500"
                          )}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {account.notes && (
                      <p className="text-xs text-gray-500 truncate">{account.notes}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit size={13} />}
                        onClick={() => openEdit(account)}
                        className="flex-1"
                      >
                        Modifier
                      </Button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAccount ? "Modifier le compte" : "Nouveau compte partagé"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom du compte"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ex: Netflix Principal"
          />
          <Select
            label="Type de service"
            required
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            label="Email du compte"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="compte@netflix.com"
          />
          <Input
            label="Mot de passe"
            required
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mot de passe du compte"
            icon={<Lock size={14} />}
          />
          <Input
            label="Nombre max de profils"
            type="number"
            value={form.maxProfiles}
            onChange={(e) =>
              setForm({ ...form, maxProfiles: parseInt(e.target.value) || 5 })
            }
            min={1}
            max={10}
          />
          {editingAccount && (
            <Select
              label="Statut"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
            </Select>
          )}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes optionnelles..."
            rows={2}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingAccount ? "Mettre à jour" : "Créer le compte"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

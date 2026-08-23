"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Trash2,
  Edit,
  Eye,
  MessageCircle,
} from "lucide-react";
import { formatDate, daysUntilExpiry, getExpiryBadgeColor, getServiceIcon } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  subscriptions: Array<{
    id: string;
    status: string;
    expiresAt: string;
    service: string;
    accountName: string;
  }>;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  async function loadClients() {
    const params = new URLSearchParams({ search, status: statusFilter });
    const res = await fetch(`/api/clients?${params}`);
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, [search, statusFilter]);

  function openCreate() {
    setEditingClient(null);
    setForm({ name: "", phone: "", email: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      notes: client.notes || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      loadClients();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce client ?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    loadClients();
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger"> = {
      active: "success",
      expired: "danger",
      suspended: "warning",
    };
    const labels: Record<string, string> = {
      active: "Actif",
      expired: "Expiré",
      suspended: "Suspendu",
    };
    return <Badge variant={map[status] || "neutral"}>{labels[status] || status}</Badge>;
  };

  return (
    <div>
      <Header
        title="Clients"
        subtitle={`${clients.length} clients enregistrés`}
        actions={
          <Button onClick={openCreate} icon={<Plus size={16} />}>
            Nouveau client
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Rechercher par nom ou téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="expired">Expirés</option>
            <option value="suspended">Suspendus</option>
          </Select>
        </div>

        {/* Clients List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chargement...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Users size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun client trouvé</p>
            <p className="text-gray-400 text-sm mt-1">
              Commencez par ajouter votre premier client
            </p>
            <Button className="mt-4" onClick={openCreate} icon={<Plus size={16} />}>
              Ajouter un client
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                      Client
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Contact
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Abonnements
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Statut
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Inscrit le
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((client) => {
                    const activeSubs = client.subscriptions.filter(
                      (s) => s.status === "active"
                    );
                    return (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                              {client.notes && (
                                <p className="text-xs text-gray-400 truncate max-w-32">{client.notes}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <a
                              href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700"
                            >
                              <MessageCircle size={12} />
                              {client.phone}
                            </a>
                            {client.email && (
                              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail size={12} />
                                {client.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {activeSubs.length === 0 ? (
                              <span className="text-xs text-gray-400">Aucun</span>
                            ) : (
                              activeSubs.slice(0, 3).map((sub) => {
                                const daysLeft = daysUntilExpiry(sub.expiresAt);
                                return (
                                  <span
                                    key={sub.id}
                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getExpiryBadgeColor(daysLeft)}`}
                                    title={sub.accountName}
                                  >
                                    {getServiceIcon(sub.service)}{" "}
                                    {daysLeft <= 0 ? "Expiré" : `J-${daysLeft}`}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(client.status)}</td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-500">{formatDate(client.createdAt)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingClient(client)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Voir"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openEdit(client)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingClient ? "Modifier le client" : "Nouveau client"}
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jean Dupont"
          />
          <Input
            label="Téléphone WhatsApp"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+221 77 000 00 00"
            hint="Avec l'indicatif pays (ex: +221, +33)"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jean@exemple.com"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes optionnelles..."
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingClient ? "Mettre à jour" : "Créer le client"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Client Modal */}
      {viewingClient && (
        <Modal
          isOpen={!!viewingClient}
          onClose={() => setViewingClient(null)}
          title={viewingClient.name}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {viewingClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewingClient.name}</h3>
                {getStatusBadge(viewingClient.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                <a
                  href={`https://wa.me/${viewingClient.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1.5"
                >
                  <MessageCircle size={14} />
                  {viewingClient.phone}
                </a>
              </div>
              {viewingClient.email && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900">{viewingClient.email}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Abonnements</h4>
              {viewingClient.subscriptions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun abonnement</p>
              ) : (
                <div className="space-y-2">
                  {viewingClient.subscriptions.map((sub) => {
                    const daysLeft = daysUntilExpiry(sub.expiresAt);
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getServiceIcon(sub.service)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.accountName}</p>
                            <p className="text-xs text-gray-500">
                              Expire le {formatDate(sub.expiresAt)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getExpiryBadgeColor(daysLeft)}`}>
                          {daysLeft <= 0 ? "Expiré" : `J-${daysLeft}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {viewingClient.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-600 mb-1">Notes</p>
                <p className="text-sm text-amber-800">{viewingClient.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

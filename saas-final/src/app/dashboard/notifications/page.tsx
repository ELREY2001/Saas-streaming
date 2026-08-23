"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Bell,
  MessageCircle,
  Send,
  CheckCircle,
  Clock,
  ExternalLink,
  Filter,
} from "lucide-react";
import { formatDateTime, getServiceIcon } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface Notification {
  id: string;
  channel: string;
  message: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  metadata: Record<string, string> | null;
  clientName: string;
  clientPhone: string;
  service: string;
  waLink: string;
}

const TYPE_LABELS: Record<string, string> = {
  delivery: "📦 Livraison",
  "7days": "📅 Rappel 7j",
  "3days": "⚠️ Rappel 3j",
  "1day": "🚨 Rappel 1j",
  expired: "❌ Expiration",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState<string | null>(null);
  const [preview, setPreview] = useState<Notification | null>(null);

  async function loadNotifications() {
    const res = await fetch(`/api/notifications?status=${filter}`);
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  async function handleSend(notif: Notification) {
    setSending(notif.id);
    try {
      await fetch(`/api/notifications/${notif.id}/send`, { method: "POST" });
      loadNotifications();
    } finally {
      setSending(null);
    }
  }

  const getTypeBadge = (metadata: Record<string, string> | null) => {
    const type = metadata?.type || "other";
    return TYPE_LABELS[type] || "📩 Message";
  };

  const getStatusBadge = (status: string) => {
    if (status === "sent")
      return (
        <Badge variant="success">
          <CheckCircle size={11} /> Envoyé
        </Badge>
      );
    if (status === "failed")
      return <Badge variant="danger">Échoué</Badge>;
    return (
      <Badge variant="warning">
        <Clock size={11} /> En attente
      </Badge>
    );
  };

  return (
    <div>
      <Header
        title="Notifications"
        subtitle="Messages WhatsApp automatiques"
      />

      <div className="p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "Toutes" },
            { key: "pending", label: "⏳ En attente" },
            { key: "sent", label: "✅ Envoyées" },
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
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Bell size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune notification</p>
            <p className="text-gray-400 text-sm mt-1">
              Les rappels automatiques apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Client avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {notif.clientName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {notif.clientName}
                        </span>
                        <span className="text-xs">{getServiceIcon(notif.service)}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {getTypeBadge(notif.metadata)}
                        </span>
                        {getStatusBadge(notif.status)}
                      </div>
                      <a
                        href={`https://wa.me/${notif.clientPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mb-2"
                      >
                        <MessageCircle size={11} />
                        {notif.clientPhone}
                      </a>
                      {/* Message preview */}
                      <div
                        className="bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setPreview(notif)}
                      >
                        <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">
                          {notif.message.substring(0, 150)}
                          {notif.message.length > 150 ? "..." : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDateTime(notif.createdAt)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreview(notif)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Aperçu"
                      >
                        <ExternalLink size={14} />
                      </button>
                      {notif.status === "pending" && (
                        <button
                          onClick={() => handleSend(notif)}
                          disabled={sending === notif.id}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                          title="Envoyer"
                        >
                          {sending === notif.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                        </button>
                      )}
                      <a
                        href={notif.waLink}
                        target="_blank"
                        className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        title="Ouvrir WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <Modal
          isOpen={!!preview}
          onClose={() => setPreview(null)}
          title={`Message pour ${preview.clientName}`}
          size="md"
        >
          <div className="space-y-4">
            {/* WhatsApp style bubble */}
            <div className="bg-[#075e54] rounded-2xl p-4">
              <div className="bg-[#128c7e] rounded-xl p-1 mb-3">
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                    {preview.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">{preview.clientName}</p>
                    <p className="text-green-200 text-xs">{preview.clientPhone}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {preview.message}
                </pre>
              </div>
            </div>

            <a
              href={preview.waLink}
              target="_blank"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors w-full"
            >
              <MessageCircle size={18} />
              Envoyer sur WhatsApp
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

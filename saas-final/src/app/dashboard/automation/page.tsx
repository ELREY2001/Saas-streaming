"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Zap, CheckCircle, XCircle, Clock, Play, RefreshCw, AlertCircle } from "lucide-react";
import { formatDateTime, getServiceIcon } from "@/lib/utils";

interface AutomationLog {
  id: string;
  actionType: string;
  status: string;
  scheduledAt: string;
  executedAt: string | null;
  result: string | null;
  errorMessage: string | null;
  createdAt: string;
  clientName: string;
  service: string;
}

const ACTION_LABELS: Record<string, string> = {
  delete_profile: "🗑️ Suppression profil",
  change_password: "🔄 Changement MDP",
  suspend_access: "🔒 Suspension accès",
  send_reminder: "📲 Rappel envoyé",
  renewal: "♻️ Renouvellement",
};

export default function AutomationPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    processed: number;
    actions: string[];
    errors: string[];
  } | null>(null);

  async function loadLogs() {
    const res = await fetch("/api/automation/logs");
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  async function runCycle() {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/automation/run", { method: "POST" });
      const data = await res.json();
      setLastResult(data.result);
      loadLogs();
    } finally {
      setRunning(false);
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "completed")
      return (
        <Badge variant="success">
          <CheckCircle size={11} /> Complété
        </Badge>
      );
    if (status === "failed")
      return (
        <Badge variant="danger">
          <XCircle size={11} /> Échoué
        </Badge>
      );
    return (
      <Badge variant="warning">
        <Clock size={11} /> En attente
      </Badge>
    );
  };

  return (
    <div>
      <Header title="Automatisation" subtitle="Moteur d'actions automatiques" />

      <div className="p-6 space-y-6">
        {/* Control Panel */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={24} className="text-yellow-300" />
                <h2 className="text-xl font-bold">Moteur d'automatisation</h2>
              </div>
              <p className="text-indigo-200 text-sm mb-4">
                Surveille les dates d'expiration, envoie des rappels WhatsApp et exécute les
                actions configurées automatiquement.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { icon: "📲", label: "Rappels WhatsApp", desc: "7j, 3j, 1j avant" },
                  { icon: "⚡", label: "Actions auto", desc: "À l'expiration" },
                  { icon: "📊", label: "Logs complets", desc: "Historique des actions" },
                ].map((f) => (
                  <div key={f.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <p className="text-sm font-semibold">{f.label}</p>
                    <p className="text-xs text-indigo-200">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={runCycle}
            loading={running}
            variant="secondary"
            size="lg"
            icon={<Play size={18} />}
          >
            {running ? "Exécution en cours..." : "Lancer le cycle d'automatisation"}
          </Button>
        </div>

        {/* Last Run Result */}
        {lastResult && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-500" />
              <h3 className="font-semibold text-gray-900">Résultat du dernier cycle</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{lastResult.processed}</p>
                <p className="text-xs text-gray-500">Abonnements traités</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{lastResult.actions.length}</p>
                <p className="text-xs text-gray-500">Actions exécutées</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{lastResult.errors.length}</p>
                <p className="text-xs text-gray-500">Erreurs</p>
              </div>
            </div>
            {lastResult.actions.length > 0 && (
              <div className="space-y-1.5">
                {lastResult.actions.map((action, i) => (
                  <div key={i} className="text-sm text-gray-700 bg-green-50 rounded-lg px-3 py-2">
                    {action}
                  </div>
                ))}
              </div>
            )}
            {lastResult.errors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {lastResult.errors.map((err, i) => (
                  <div key={i} className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle size={12} className="inline mr-1" />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">⚙️ Comment fonctionne l'automatisation ?</h3>
          <div className="space-y-3">
            {[
              {
                step: "J-7",
                color: "bg-blue-100 text-blue-800",
                action: "Envoi du premier rappel WhatsApp au client",
              },
              {
                step: "J-3",
                color: "bg-orange-100 text-orange-800",
                action: "Envoi du rappel urgent WhatsApp",
              },
              {
                step: "J-1",
                color: "bg-red-100 text-red-800",
                action: "Rappel critique — expiration imminente",
              },
              {
                step: "J=0",
                color: "bg-gray-800 text-white",
                action: "Exécution automatique de l'action configurée (suspension, suppression, etc.)",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${item.color}`}
                >
                  {item.step}
                </span>
                <p className="text-sm text-gray-700">{item.action}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              💡 <strong>Note :</strong> En production, lancez un cron job qui appelle{" "}
              <code className="bg-amber-100 px-1 rounded">POST /api/automation/run</code> toutes les
              heures pour une surveillance en temps réel.
            </p>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Journal des actions</h3>
            <button
              onClick={loadLogs}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Aucune action enregistrée pour le moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Client", "Service", "Action", "Statut", "Planifié", "Exécuté", "Résultat"].map(
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
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {log.clientName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-lg">{getServiceIcon(log.service)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {ACTION_LABELS[log.actionType] || log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(log.scheduledAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.executedAt ? formatDateTime(log.executedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-48 truncate">
                        {log.result || log.errorMessage || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

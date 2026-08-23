"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  DollarSign,
  Server,
  Bell,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { formatCurrency, formatDateTime, daysUntilExpiry, getExpiryBadgeColor, getServiceIcon } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface Stats {
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalClients: number;
  expiringIn7Days: number;
  expiringIn3Days: number;
  monthRevenue: number;
  totalRevenue: number;
  activeAccounts: number;
  pendingNotifications: number;
}

interface ExpiringSub {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  accountName: string;
  expiresAt: string;
  price: string;
  currency: string;
  profileName: string | null;
  reminderSent1Day: boolean;
  reminderSent3Days: boolean;
}

interface RecentPayment {
  id: string;
  clientName: string;
  amount: string;
  currency: string;
  status: string;
  method: string | null;
  paidAt: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringSub[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      setStats(data.stats);
      setExpiringSoon(data.expiringSoon || []);
      setRecentPayments(data.recentPayments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Abonnements actifs",
      value: stats?.activeSubscriptions ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Clients total",
      value: stats?.totalClients ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "Expirent dans 7j",
      value: stats?.expiringIn7Days ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    {
      label: "Urgents (≤3j)",
      value: stats?.expiringIn3Days ?? 0,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
    {
      label: "Revenu du mois",
      value: formatCurrency(stats?.monthRevenue ?? 0),
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
    },
    {
      label: "Revenu total",
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
    {
      label: "Comptes partagés",
      value: stats?.activeAccounts ?? 0,
      icon: Server,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-200",
    },
    {
      label: "Notifs en attente",
      value: stats?.pendingNotifications ?? 0,
      icon: Bell,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
    },
  ];

  return (
    <div>
      <Header
        title="Tableau de bord"
        subtitle="Vue d'ensemble de vos comptes partagés"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`bg-white rounded-2xl border ${card.border} p-5 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <Icon size={20} className={card.color} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Soon */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                <h2 className="font-semibold text-gray-900">Expire bientôt</h2>
              </div>
              <Link
                href="/dashboard/subscriptions?filter=expiring_soon"
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
              >
                Voir tout <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {expiringSoon.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">
                  <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                  Aucun abonnement n'expire dans les 7 prochains jours
                </div>
              ) : (
                expiringSoon.map((sub) => {
                  const daysLeft = daysUntilExpiry(sub.expiresAt);
                  const badgeColor = getExpiryBadgeColor(daysLeft);
                  return (
                    <div key={sub.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getServiceIcon(sub.service)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.clientName}</p>
                            <p className="text-xs text-gray-500">{sub.accountName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`https://wa.me/${sub.clientPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </Link>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {daysLeft <= 0 ? "Expiré" : `J-${daysLeft}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Paiements récents</h2>
              </div>
              <Link
                href="/dashboard/subscriptions"
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
              >
                Voir tout <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentPayments.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">
                  <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
                  Aucun paiement enregistré
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{payment.clientName}</p>
                        <p className="text-xs text-gray-500">
                          {payment.method || "Non spécifié"} •{" "}
                          {payment.paidAt
                            ? formatDateTime(payment.paidAt)
                            : formatDateTime(payment.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          +{formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <Badge
                          variant={
                            payment.status === "paid"
                              ? "success"
                              : payment.status === "pending"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {payment.status === "paid"
                            ? "Payé"
                            : payment.status === "pending"
                            ? "En attente"
                            : "Échoué"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="font-bold text-lg mb-1">Actions rapides</h2>
          <p className="text-indigo-200 text-sm mb-4">Gérez vos comptes partagés efficacement</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/dashboard/clients", label: "Ajouter un client", emoji: "👤" },
              { href: "/dashboard/accounts", label: "Nouveau compte", emoji: "🔑" },
              { href: "/dashboard/subscriptions", label: "Créer abonnement", emoji: "📋" },
              { href: "/dashboard/notifications", label: "Envoyer relance", emoji: "📲" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-3 transition-colors text-center"
              >
                <div className="text-2xl mb-1">{action.emoji}</div>
                <p className="text-sm font-medium">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

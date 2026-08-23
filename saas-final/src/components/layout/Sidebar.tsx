"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Key,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Vue d'ensemble",
  },
  {
    href: "/dashboard/clients",
    icon: Users,
    label: "Clients",
    description: "Gestion des clients",
  },
  {
    href: "/dashboard/accounts",
    icon: Key,
    label: "Comptes partagés",
    description: "Gérer vos comptes",
  },
  {
    href: "/dashboard/subscriptions",
    icon: CreditCard,
    label: "Abonnements",
    description: "Suivi des accès",
  },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    label: "Notifications",
    description: "Messages WhatsApp",
  },
  {
    href: "/dashboard/automation",
    icon: Zap,
    label: "Automatisation",
    description: "Actions & logs",
  },
  {
    href: "/dashboard/settings",
    icon: Settings,
    label: "Paramètres",
    description: "Configuration",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">AccountFlow</p>
            <p className="text-xs text-slate-400">Gestion automatisée</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", isActive ? "text-white" : "text-slate-300")}>
                  {item.label}
                </p>
              </div>
              {isActive && <ChevronRight size={14} className="text-indigo-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 group"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">
            {loggingOut ? "Déconnexion..." : "Se déconnecter"}
          </span>
        </button>
      </div>
    </aside>
  );
}

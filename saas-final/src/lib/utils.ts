import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: fr });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: fr });
}

export function formatRelative(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function daysUntilExpiry(expiresAt: Date | string): number {
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return differenceInDays(d, new Date());
}

export function isExpired(expiresAt: Date | string): boolean {
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return isPast(d);
}

export function getExpiryStatusColor(daysLeft: number): string {
  if (daysLeft < 0) return "text-red-600 bg-red-50";
  if (daysLeft <= 1) return "text-red-500 bg-red-50";
  if (daysLeft <= 3) return "text-orange-500 bg-orange-50";
  if (daysLeft <= 7) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
}

export function getExpiryBadgeColor(daysLeft: number): string {
  if (daysLeft < 0) return "bg-red-100 text-red-800 border-red-200";
  if (daysLeft <= 1) return "bg-red-100 text-red-700 border-red-200";
  if (daysLeft <= 3) return "bg-orange-100 text-orange-700 border-orange-200";
  if (daysLeft <= 7) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

export function formatCurrency(amount: string | number, currency = "XOF"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (currency === "XOF") {
    return `${num.toLocaleString("fr-FR")} FCFA`;
  }
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(num);
}

export function getServiceIcon(service: string): string {
  const icons: Record<string, string> = {
    netflix: "🎬",
    spotify: "🎵",
    disney: "✨",
    amazon: "📦",
    crunchyroll: "🎌",
    youtube: "▶️",
    other: "🔑",
  };
  return icons[service] || "🔑";
}

export function getServiceColor(service: string): string {
  const colors: Record<string, string> = {
    netflix: "bg-red-600",
    spotify: "bg-green-500",
    disney: "bg-blue-700",
    amazon: "bg-orange-500",
    crunchyroll: "bg-orange-600",
    youtube: "bg-red-500",
    other: "bg-purple-600",
  };
  return colors[service] || "bg-gray-600";
}

export function getServiceGradient(service: string): string {
  const gradients: Record<string, string> = {
    netflix: "from-red-700 to-red-900",
    spotify: "from-green-400 to-green-700",
    disney: "from-blue-600 to-indigo-800",
    amazon: "from-orange-400 to-yellow-600",
    crunchyroll: "from-orange-500 to-orange-700",
    youtube: "from-red-500 to-red-700",
    other: "from-purple-500 to-purple-800",
  };
  return gradients[service] || "from-gray-600 to-gray-800";
}

export function buildWhatsAppMessage(
  template: string,
  variables: Record<string, string>
): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return message;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

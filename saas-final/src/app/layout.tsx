import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccountFlow — Gestion de comptes partagés",
  description: "Plateforme SaaS de gestion automatisée de comptes partagés (Netflix, Spotify, etc.)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}

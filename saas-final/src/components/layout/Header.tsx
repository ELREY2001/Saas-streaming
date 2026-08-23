"use client";
import { Bell, Search, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function runAutomation() {
    setRunning(true);
    try {
      const res = await fetch("/api/automation/run", { method: "POST" });
      const data = await res.json();
      setLastRun(
        `${data.result?.processed || 0} traités, ${data.result?.actions?.length || 0} actions`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          {lastRun && (
            <p className="text-xs text-green-600 mt-1">✅ Dernière exécution: {lastRun}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            loading={running}
            onClick={runAutomation}
            icon={<RefreshCw size={15} />}
            title="Lancer l'automatisation"
          >
            Automatisation
          </Button>
          {actions}
        </div>
      </div>
    </header>
  );
}

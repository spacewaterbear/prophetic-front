"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import type { Trace, TraceProfile } from "@/types/traces";
import { UsersSidebar } from "./UsersSidebar";
import { TracesList } from "./TracesList";
import { TraceDetail } from "./TraceDetail";
import { useI18n } from "@/contexts/i18n-context";

export function TracesDashboard() {
  const { t } = useI18n();
  const [selectedUser, setSelectedUser] = useState<TraceProfile | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function handleSelectUser(user: TraceProfile) {
    setSelectedUser(user);
    setSelectedTrace(null);
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-4 h-12 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <Activity className="w-4 h-4 text-indigo-500" />
        <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {t("admin.traces.title")}
        </h1>
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: users */}
        <aside
          className={`${sidebarCollapsed ? "w-11" : "w-56"} transition-[width] duration-200 ease-in-out flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden`}
          onMouseEnter={() => setSidebarCollapsed(false)}
          onMouseLeave={() => { if (selectedUser) setSidebarCollapsed(true); }}
        >
          <UsersSidebar
            selectedUserId={selectedUser?.id ?? null}
            onSelect={handleSelectUser}
            collapsed={sidebarCollapsed}
          />
        </aside>

        {/* Middle: traces */}
        <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
          <TracesList
            user={selectedUser}
            selectedTraceId={selectedTrace?.id ?? null}
            onSelect={setSelectedTrace}
          />
        </aside>

        {/* Right: detail + observation tree */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <TraceDetail trace={selectedTrace} />
        </main>
      </div>
    </div>
  );
}

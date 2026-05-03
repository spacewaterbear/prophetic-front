"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock, DollarSign } from "lucide-react";
import type { Trace, TraceProfile } from "@/types/traces";
import { useI18n } from "@/contexts/i18n-context";

interface TracesListProps {
  user: TraceProfile | null;
  selectedTraceId: string | null;
  onSelect: (trace: Trace) => void;
}

export function TracesList({ user, selectedTraceId, onSelect }: TracesListProps) {
  const { t } = useI18n();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTraces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/traces?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setTraces([]);
    fetchTraces();
  }, [fetchTraces]);

  // Auto-refresh every 30s when a user is selected
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchTraces, 30_000);
    return () => clearInterval(id);
  }, [user, fetchTraces]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-400 dark:text-zinc-500 p-6 text-center">
        {t("admin.traces.noUserSelected")}
      </div>
    );
  }

  const displayName =
    user.first_name || user.last_name
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
      : user.username ?? user.mail ?? user.id.slice(0, 8);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">
            {displayName}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {traces.length} traces
          </p>
        </div>
        <button
          type="button"
          onClick={fetchTraces}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && traces.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-zinc-400">
            {t("admin.traces.loading")}
          </div>
        ) : traces.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-zinc-400">
            {t("admin.traces.noTraces")}
          </div>
        ) : (
          <ul>
            {traces.map((trace) => {
              const isSelected = trace.id === selectedTraceId;
              return (
                <li key={trace.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(trace)}
                    className={`w-full text-left px-3 py-3 border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 border-l-2 border-l-indigo-500"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate leading-tight">
                      {trace.name ?? `Trace ${trace.id.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {trace.timestamp && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {new Date(trace.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {trace.total_cost > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                          <DollarSign className="w-3 h-3" />
                          {trace.total_cost.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

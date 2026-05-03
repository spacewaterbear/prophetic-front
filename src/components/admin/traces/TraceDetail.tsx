"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import type { Trace, Observation } from "@/types/traces";
import { ObservationTree } from "./ObservationTree";
import { useI18n } from "@/contexts/i18n-context";

interface TraceDetailProps {
  trace: Trace | null;
}

export function TraceDetail({ trace }: TraceDetailProps) {
  const { t } = useI18n();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchObservations = useCallback(async () => {
    if (!trace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/traces/${trace.id}/observations`);
      if (res.ok) {
        const data = await res.json();
        setObservations(data);
      }
    } finally {
      setLoading(false);
    }
  }, [trace]);

  useEffect(() => {
    setObservations([]);
    fetchObservations();
  }, [fetchObservations]);

  if (!trace) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500 p-8 text-center">
        {t("admin.traces.noTraceSelected")}
      </div>
    );
  }

  const totalObsCost = observations.reduce((sum, o) => sum + (o.usage_cost ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {trace.id.slice(0, 8)}…
          </p>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5 truncate">
            {trace.name ?? t("admin.traces.traceDetails")}
          </h2>
          {trace.timestamp && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {new Date(trace.timestamp).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <div className="text-right">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t("admin.traces.totalCost")}</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ${(trace.total_cost + totalObsCost).toFixed(6)}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchObservations}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Trace I/O */}
        {(trace.input || trace.output) && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {t("admin.traces.traceDetails")}
            </p>
            {trace.input && (
              <div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  {t("admin.traces.input")}
                </p>
                <pre className="p-2 rounded bg-zinc-900 dark:bg-zinc-950 text-zinc-200 text-xs overflow-x-auto max-h-36 leading-relaxed">
                  {JSON.stringify(trace.input, null, 2)}
                </pre>
              </div>
            )}
            {trace.output && (
              <div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  {t("admin.traces.output")}
                </p>
                <pre className="p-2 rounded bg-zinc-900 dark:bg-zinc-950 text-zinc-200 text-xs overflow-x-auto max-h-36 leading-relaxed">
                  {JSON.stringify(trace.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Observation tree */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          {loading ? (
            <p className="text-sm text-zinc-400 py-4 text-center">{t("admin.traces.loading")}</p>
          ) : (
            <ObservationTree observations={observations} />
          )}
        </div>
      </div>
    </div>
  );
}

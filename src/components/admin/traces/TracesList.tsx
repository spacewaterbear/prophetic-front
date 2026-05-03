"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, Clock, DollarSign, ChevronDown } from "lucide-react";
import type { Trace, TraceProfile } from "@/types/traces";
import { useI18n } from "@/contexts/i18n-context";

function extractImmoPrice(trace: { output: Record<string, unknown> | null; metadata: Record<string, unknown> | null }): number | null {
  for (const obj of [trace.output, trace.metadata]) {
    if (!obj) continue;
    for (const src of [obj, (obj as Record<string, unknown>).output]) {
      if (!src || typeof src !== "object") continue;
      const immo = (src as Record<string, unknown>).immo_display_data;
      if (immo && typeof immo === "object") {
        const est = (immo as Record<string, unknown>).estimation;
        if (est && typeof est === "object") {
          const tk = (est as Record<string, unknown>).total_k;
          if (typeof tk === "number") return tk;
        }
      }
    }
  }
  return null;
}

function extractUserContent(input: Record<string, unknown> | null): string | null {
  if (!input) return null;
  // Format: { messages: [[{ type: "human", content: "..." }]] } (LangChain)
  const msgs = input.messages;
  if (Array.isArray(msgs)) {
    for (const item of msgs) {
      const arr = Array.isArray(item) ? item : [item];
      for (const m of arr) {
        if (m && typeof m === "object") {
          const role = (m as Record<string, unknown>).role ?? (m as Record<string, unknown>).type;
          if (role === "human" || role === "user") {
            const content = (m as Record<string, unknown>).content;
            if (typeof content === "string") return content;
          }
        }
      }
    }
  }
  // Format: { input: "..." } or { content: "..." }
  for (const key of ["input", "content", "query", "text"]) {
    if (typeof input[key] === "string") return input[key] as string;
  }
  return null;
}

const PAGE_SIZE = 50;

interface TracesListProps {
  user: TraceProfile | null;
  selectedTraceId: string | null;
  onSelect: (trace: Trace) => void;
}

interface TooltipState {
  label: string;
  x: number;
  y: number;
}

export function TracesList({ user, selectedTraceId, onSelect }: TracesListProps) {
  const { t } = useI18n();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const seenIds = useRef(new Set<string>());

  const fetchPage = useCallback(
    async (before?: string): Promise<{ data: Trace[]; hasMore: boolean }> => {
      if (!user) return { data: [], hasMore: false };
      const url = `/api/admin/traces?userId=${user.id}${before ? `&before=${encodeURIComponent(before)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return { data: [], hasMore: false };
      return res.json();
    },
    [user]
  );

  // Initial load / hard refresh
  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, hasMore: more } = await fetchPage();
      seenIds.current = new Set(data.map((t) => t.id));
      setTraces(data);
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, [user, fetchPage]);

  // Auto-refresh: fetch first page and prepend genuinely new items
  const autoRefresh = useCallback(async () => {
    if (!user) return;
    const { data } = await fetchPage();
    const newItems = data.filter((t) => !seenIds.current.has(t.id));
    if (newItems.length > 0) {
      for (const item of newItems) seenIds.current.add(item.id);
      setTraces((prev) => {
        const merged = [...newItems, ...prev];
        // Deduplicate by id preserving order
        const seen = new Set<string>();
        return merged.filter((t) => (seen.has(t.id) ? false : seen.add(t.id) && true));
      });
    }
  }, [user, fetchPage]);

  // Load next page (cursor = timestamp of last item)
  const loadMore = useCallback(async () => {
    const cursor = traces[traces.length - 1]?.timestamp;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, hasMore: more } = await fetchPage(cursor);
      const newItems = data.filter((t) => !seenIds.current.has(t.id));
      for (const item of newItems) seenIds.current.add(item.id);
      setTraces((prev) => [...prev, ...newItems]);
      setHasMore(more);
    } finally {
      setLoadingMore(false);
    }
  }, [traces, loadingMore, fetchPage]);

  useEffect(() => {
    seenIds.current = new Set();
    setTraces([]);
    setHasMore(false);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(autoRefresh, 30_000);
    return () => clearInterval(id);
  }, [user, autoRefresh]);

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
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium truncate">
            {displayName}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {traces.length}{hasMore ? "+" : ""} traces
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
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
          <>
            <ul>
              {traces.map((trace) => {
                const isSelected = trace.id === selectedTraceId;
                const userContent = extractUserContent(trace.input);
                const label = userContent ?? trace.name ?? `Trace ${trace.id.slice(0, 8)}`;
                const immoPrice = extractImmoPrice(trace);
                return (
                  <li key={trace.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(trace)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ label, x: rect.right + 8, y: rect.top + rect.height / 2 });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      className={`w-full text-left px-3 py-3 border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                        isSelected
                          ? "bg-zinc-100 dark:bg-zinc-800 border-l-2 border-l-indigo-500"
                          : "border-l-2 border-l-transparent"
                      }`}
                    >
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate leading-tight">
                        {label}
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
                        {immoPrice !== null && (
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                            {immoPrice.toLocaleString("fr-FR")} k€
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <div className="p-3">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-md transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {t("admin.traces.loadMore")}
                  {!loadingMore && (
                    <span className="text-zinc-400 dark:text-zinc-500">
                      ({PAGE_SIZE})
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {tooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 shadow-md w-64 break-words"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateY(-50%)" }}
        >
          {tooltip.label}
        </div>,
        document.body
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { TraceProfile } from "@/types/traces";
import { useI18n } from "@/contexts/i18n-context";

const STATUS_COLORS: Record<string, string> = {
  oracle: "bg-indigo-500",
  intelligence: "bg-blue-500",
  discover: "bg-sky-500",
  admini: "bg-rose-500",
  paid: "bg-emerald-500",
  free: "bg-zinc-400",
  unauthorized: "bg-zinc-300",
};

interface UsersSidebarProps {
  selectedUserId: string | null;
  onSelect: (user: TraceProfile) => void;
  collapsed?: boolean;
}

export function UsersSidebar({ selectedUserId, onSelect, collapsed = false }: UsersSidebarProps) {
  const { t } = useI18n();
  const [users, setUsers] = useState<TraceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.mail?.toLowerCase().includes(q)
    );
  }, [users, query]);

  function initials(u: TraceProfile): string {
    const fn = u.first_name?.[0] ?? "";
    const ln = u.last_name?.[0] ?? "";
    if (fn || ln) return `${fn}${ln}`.toUpperCase();
    return (u.username?.[0] ?? u.mail?.[0] ?? "?").toUpperCase();
  }

  function displayName(u: TraceProfile): string {
    if (u.first_name || u.last_name) {
      return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
    }
    return u.username ?? u.mail ?? u.id.slice(0, 8);
  }

  if (collapsed) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto py-1">
          <ul>
            {filtered.map((user) => {
              const isSelected = user.id === selectedUserId;
              const dot = STATUS_COLORS[user.status] ?? "bg-zinc-400";
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(user)}
                    title={displayName(user)}
                    className={`w-full flex justify-center py-2 transition-colors border-l-2 ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 border-l-indigo-500"
                        : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {initials(user)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${dot}`}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          {t("admin.traces.users")}
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.traces.searchPlaceholder")}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-zinc-400">
            {t("admin.traces.loading")}
          </div>
        ) : (
          <ul>
            {filtered.map((user) => {
              const isSelected = user.id === selectedUserId;
              const dot = STATUS_COLORS[user.status] ?? "bg-zinc-400";
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(user)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-l-2 ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 border-l-indigo-500"
                        : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {initials(user)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${dot}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate">
                          {displayName(user)}
                        </p>
                        {user.trace_count > 0 && (
                          <span className="flex-shrink-0 text-xs font-mono text-zinc-400 dark:text-zinc-500">
                            {user.trace_count}
                          </span>
                        )}
                      </div>
                      {user.mail && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                          {user.mail}
                        </p>
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

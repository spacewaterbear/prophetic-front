"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Zap, GitBranch, Dot } from "lucide-react";
import type { Observation, ObservationNode } from "@/types/traces";
import { useI18n } from "@/contexts/i18n-context";

function buildTree(observations: Observation[]): ObservationNode[] {
  const map = new Map<string, ObservationNode>();
  const roots: ObservationNode[] = [];

  for (const obs of observations) {
    map.set(obs.id, { ...obs, children: [] });
  }

  for (const obs of observations) {
    const node = map.get(obs.id)!;
    if (obs.parent_observation_id && map.has(obs.parent_observation_id)) {
      map.get(obs.parent_observation_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null || cost === 0) return "—";
  return `$${cost.toFixed(6)}`;
}

function typeConfig(type: string) {
  switch (type) {
    case "GENERATION":
      return {
        icon: <Zap className="w-3 h-3" />,
        badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
        border: "border-l-indigo-400",
      };
    case "SPAN":
      return {
        icon: <GitBranch className="w-3 h-3" />,
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        border: "border-l-emerald-400",
      };
    default:
      return {
        icon: <Dot className="w-4 h-4" />,
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        border: "border-l-amber-400",
      };
  }
}

interface JsonViewerProps {
  data: Record<string, unknown> | null;
  label: string;
}

function JsonViewer({ data, label }: JsonViewerProps) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && (
        <pre className="mt-1 p-2 rounded bg-zinc-900 dark:bg-zinc-950 text-zinc-200 text-xs overflow-x-auto max-h-48 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

interface NodeProps {
  node: ObservationNode;
  depth: number;
  expandAll: boolean;
}

function ObservationNodeItem({ node, depth, expandAll }: NodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const { t } = useI18n();
  const cfg = typeConfig(node.type);
  const hasChildren = node.children.length > 0;
  const duration = getDuration(node.start_time, node.end_time);

  return (
    <div className={`border-l-2 ${cfg.border} pl-3 ${depth > 0 ? "mt-2" : ""}`}>
      <div
        className="group flex items-start gap-2 py-2 cursor-pointer"
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        <div className="mt-0.5 text-zinc-400 w-3 flex-shrink-0">
          {hasChildren ? (
            open || expandAll ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${cfg.badge}`}
            >
              {cfg.icon}
              {node.type}
            </span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
              {node.name ?? "—"}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {duration !== "—" && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("admin.traces.duration")}: <span className="font-mono">{duration}</span>
              </span>
            )}
            {node.usage_tokens !== null && node.usage_tokens > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("admin.traces.tokens")}: <span className="font-mono">{node.usage_tokens.toLocaleString()}</span>
              </span>
            )}
            {node.usage_cost !== null && node.usage_cost > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("admin.traces.cost")}: <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCost(node.usage_cost)}</span>
              </span>
            )}
          </div>

          <JsonViewer data={node.input} label={t("admin.traces.input")} />
          <JsonViewer data={node.output} label={t("admin.traces.output")} />
        </div>
      </div>

      {(open || expandAll) && hasChildren && (
        <div className="pl-2">
          {node.children.map((child) => (
            <ObservationNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ObservationTreeProps {
  observations: Observation[];
}

export function ObservationTree({ observations }: ObservationTreeProps) {
  const { t } = useI18n();
  const [expandAll, setExpandAll] = useState(false);
  const roots = buildTree(observations);

  if (observations.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
        {t("admin.traces.noObservations")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("admin.traces.steps")}
        </h3>
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          {expandAll ? t("admin.traces.collapseAll") : t("admin.traces.expandAll")}
        </button>
      </div>

      <div className="space-y-1">
        {roots.map((root) => (
          <ObservationNodeItem key={root.id} node={root} depth={0} expandAll={expandAll} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Zap, GitBranch, Dot, X } from "lucide-react";
import type { Observation, ObservationNode } from "@/types/traces";
import { useI18n } from "@/contexts/i18n-context";

const NODE_W = 176;
const NODE_H = 68;
const H_GAP = 44;
const V_GAP = 60;
const PADDING = 28;
/** Sort observations by start_time ascending (nulls last). */
function sortByTime(obs: Observation[]): Observation[] {
  return [...obs].sort((a, b) => {
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}

function makeVirtualNode(id: string, traceId: string): ObservationNode {
  return {
    id,
    trace_id: traceId,
    parent_observation_id: null,
    type: "SPAN",
    name: "(root)",
    start_time: null,
    end_time: null,
    input: null,
    output: null,
    usage_tokens: null,
    usage_cost: null,
    children: [],
  };
}

/** Remove SPAN nodes with no input and no output, re-parenting their children upward. */
function pruneEmptySpans(node: ObservationNode): ObservationNode {
  const newChildren: ObservationNode[] = [];
  for (const child of node.children) {
    const processed = pruneEmptySpans(child);
    if (processed.type === "SPAN" && processed.input === null && processed.output === null) {
      newChildren.push(...processed.children);
    } else {
      newChildren.push(processed);
    }
  }
  return { ...node, children: newChildren };
}

/**
 * Build a tree that guarantees exactly one root:
 * - If no parent_observation_id exists anywhere → chain all nodes linearly by start_time.
 * - If parent refs exist → link nodes, create virtual placeholders for missing parents,
 *   then merge multiple roots under a synthetic "trace" root sorted by start_time.
 * - Empty SPAN nodes (no input, no output) are pruned; their children are re-parented up.
 */
function buildTree(observations: Observation[]): ObservationNode[] {
  if (observations.length === 0) return [];

  const sorted = sortByTime(observations);
  const traceId = sorted[0].trace_id;

  // No parent connections at all → linear time chain (skip empty spans inline)
  const hasConnections = sorted.some((o) => o.parent_observation_id !== null);
  if (!hasConnections) {
    const meaningful = sorted.filter(
      (o) => !(o.type === "SPAN" && o.input === null && o.output === null),
    );
    const source = meaningful.length > 0 ? meaningful : sorted;
    const nodes: ObservationNode[] = source.map((o) => ({ ...o, children: [] }));
    for (let i = 0; i + 1 < nodes.length; i++) nodes[i].children.push(nodes[i + 1]);
    return [nodes[0]];
  }

  // Build id → node map
  const map = new Map<string, ObservationNode>();
  for (const obs of sorted) map.set(obs.id, { ...obs, children: [] });

  // Create virtual placeholders for referenced-but-absent parents
  const allParentIds = new Set<string>(
    sorted.map((o) => o.parent_observation_id).filter(Boolean) as string[],
  );
  for (const pid of allParentIds) {
    if (!map.has(pid)) map.set(pid, makeVirtualNode(pid, traceId));
  }

  // Wire children to parents; track child ids
  const childIds = new Set<string>();
  for (const obs of sorted) {
    if (obs.parent_observation_id) {
      const parent = map.get(obs.parent_observation_id);
      if (parent) {
        parent.children.push(map.get(obs.id)!);
        childIds.add(obs.id);
      }
    }
  }

  // Roots = nodes that are not anyone's child; prune empty spans from each subtree
  const roots = [...map.values()]
    .filter((n) => !childIds.has(n.id))
    .map(pruneEmptySpans);

  if (roots.length <= 1) return roots;

  // Multiple roots → synthetic root (sorted by start_time so earliest is first child)
  roots.sort((a, b) => {
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const synthetic: ObservationNode = {
    id: "__synthetic_root__",
    trace_id: traceId,
    parent_observation_id: null,
    type: "SPAN",
    name: "trace",
    start_time: roots[0]?.start_time ?? null,
    end_time: roots[roots.length - 1]?.end_time ?? null,
    input: null,
    output: null,
    usage_tokens: null,
    usage_cost: null,
    children: roots,
  };
  return [synthetic];
}

function getDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number | null): string {
  if (!cost || cost === 0) return "";
  return `$${cost.toFixed(6)}`;
}

type TypeCfg = {
  icon: React.ReactNode;
  badge: string;
  borderColor: string;
  ringColor: string;
  edgeColor: string;
};

function typeConfig(type: string): TypeCfg {
  switch (type) {
    case "GENERATION":
      return {
        icon: <Zap className="w-3 h-3" />,
        badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
        borderColor: "#818cf8",
        ringColor: "#818cf8",
        edgeColor: "#818cf8",
      };
    case "SPAN":
      return {
        icon: <GitBranch className="w-3 h-3" />,
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        borderColor: "#34d399",
        ringColor: "#34d399",
        edgeColor: "#34d399",
      };
    default:
      return {
        icon: <Dot className="w-4 h-4" />,
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        borderColor: "#fbbf24",
        ringColor: "#fbbf24",
        edgeColor: "#fbbf24",
      };
  }
}

function getSubtreeWidth(node: ObservationNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + getSubtreeWidth(c), 0);
}

interface LayoutNode {
  node: ObservationNode;
  x: number;
  y: number;
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

function layoutTree(
  node: ObservationNode,
  level: number,
  startSlot: number,
  nodes: LayoutNode[],
  edges: Edge[],
  parentPos: { x: number; y: number } | null,
): void {
  const totalWidth = getSubtreeWidth(node);
  const centerSlot = startSlot + (totalWidth - 1) / 2;
  const x = PADDING + centerSlot * (NODE_W + H_GAP);
  const y = PADDING + level * (NODE_H + V_GAP);

  nodes.push({ node, x, y });

  if (parentPos) {
    const cfg = typeConfig(node.type);
    const midY = (parentPos.y + NODE_H + y) / 2;
    edges.push({
      x1: parentPos.x + NODE_W / 2,
      y1: parentPos.y + NODE_H,
      x2: x + NODE_W / 2,
      y2: y,
      color: cfg.edgeColor,
    });
    void midY;
  }

  let slot = startSlot;
  for (const child of node.children) {
    layoutTree(child, level + 1, slot, nodes, edges, { x, y });
    slot += getSubtreeWidth(child);
  }
}

interface NodeDetailPanelProps {
  node: ObservationNode;
  onClose: () => void;
}

function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const { t } = useI18n();
  const cfg = typeConfig(node.type);
  const duration = getDuration(node.start_time, node.end_time);
  const cost = formatCost(node.usage_cost);

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${cfg.badge} flex-shrink-0`}>
            {cfg.icon}
            {node.type}
          </span>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
            {node.name ?? "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 ml-2 flex-shrink-0 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {(duration || (node.usage_tokens && node.usage_tokens > 0) || cost) && (
          <div className="flex gap-4 flex-wrap">
            {duration && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("admin.traces.duration")}: <span className="font-mono">{duration}</span>
              </span>
            )}
            {node.usage_tokens !== null && node.usage_tokens > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("admin.traces.tokens")}: <span className="font-mono">{node.usage_tokens.toLocaleString()}</span>
              </span>
            )}
            {cost && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("admin.traces.cost")}:{" "}
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{cost}</span>
              </span>
            )}
          </div>
        )}

        {node.input && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {t("admin.traces.input")}
            </p>
            <pre className="p-2.5 rounded-md bg-zinc-900 dark:bg-zinc-950 text-zinc-200 text-xs overflow-auto max-h-52 leading-relaxed">
              {JSON.stringify(node.input, null, 2)}
            </pre>
          </div>
        )}

        {node.output && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {t("admin.traces.output")}
            </p>
            <pre className="p-2.5 rounded-md bg-zinc-900 dark:bg-zinc-950 text-zinc-200 text-xs overflow-auto max-h-52 leading-relaxed">
              {JSON.stringify(node.output, null, 2)}
            </pre>
          </div>
        )}

        {!node.input && !node.output && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-1">—</p>
        )}
      </div>
    </div>
  );
}

interface ObservationGraphProps {
  observations: Observation[];
}

export function ObservationGraph({ observations }: ObservationGraphProps) {
  const { t } = useI18n();
  const [selectedNode, setSelectedNode] = useState<ObservationNode | null>(null);

  const { layoutNodes, edges, canvasWidth, canvasHeight } = useMemo(() => {
    const roots = buildTree(observations);
    const layoutNodes: LayoutNode[] = [];
    const edges: Edge[] = [];

    let slot = 0;
    for (const root of roots) {
      layoutTree(root, 0, slot, layoutNodes, edges, null);
      slot += getSubtreeWidth(root);
    }

    const canvasWidth =
      layoutNodes.length === 0
        ? 200
        : Math.max(...layoutNodes.map((n) => n.x)) + NODE_W + PADDING;
    const canvasHeight =
      layoutNodes.length === 0
        ? 100
        : Math.max(...layoutNodes.map((n) => n.y)) + NODE_H + PADDING;

    return { layoutNodes, edges, canvasWidth, canvasHeight };
  }, [observations]);

  if (observations.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
        {t("admin.traces.noObservations")}
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden rounded-md bg-zinc-50/50 dark:bg-zinc-900/30">
        <div style={{ width: canvasWidth, height: canvasHeight, position: "relative" }}>
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: canvasWidth,
              height: canvasHeight,
              pointerEvents: "none",
            }}
          >
            {edges.map((edge, i) => {
              const midY = (edge.y1 + edge.y2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY} ${edge.x2} ${midY} ${edge.x2} ${edge.y2}`}
                  stroke={edge.color}
                  strokeWidth={1.5}
                  fill="none"
                  strokeOpacity={0.5}
                />
              );
            })}
          </svg>

          {layoutNodes.map(({ node, x, y }) => {
            const isSynthetic = node.id === "__synthetic_root__";
            const cfg = typeConfig(node.type);
            const duration = getDuration(node.start_time, node.end_time);
            const isSelected = selectedNode?.id === node.id;

            return (
              <button
                key={node.id}
                type="button"
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: NODE_W,
                  borderColor: isSynthetic ? "#71717a" : cfg.borderColor,
                  boxShadow: isSelected ? `0 0 0 2px ${cfg.ringColor}` : undefined,
                  opacity: isSynthetic ? 0.6 : 1,
                }}
                className="rounded-lg border-2 p-2.5 text-left bg-white dark:bg-zinc-800 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedNode(isSynthetic ? null : isSelected ? null : node)}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${isSynthetic ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400" : cfg.badge}`}>
                    {cfg.icon}
                    <span className="truncate max-w-[72px]">{node.type}</span>
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate leading-tight">
                  {node.name ?? "—"}
                </p>
                {duration && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-1">{duration}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedNode && (
        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}

export const DISCOVER_PORTFOLIO_TIERS = [
  { label: "1k-3k NEOPHYTE", value: "1k-3k_NEOPHYTE" },
  { label: "3k-5k DEBUTANT", value: "3k-5k_DEBUTANT" },
  { label: "6k-8k ECLAIRE", value: "6k-8k_ECLAIRE" },
  { label: "8k-10k AVERTI", value: "8k-10k_AVERTI" },
  { label: "10k-13k CONFIRME", value: "10k-13k_CONFIRME" },
  { label: "13k-16k AGUERRI", value: "13k-16k_AGUERRI" },
  { label: "16k-19k CHEVRONNE", value: "16k-19k_CHEVRONNE" },
  { label: "19k-21k ACCOMPLI", value: "19k-21k_ACCOMPLI" },
  { label: "21k-25k EMINENT", value: "21k-25k_EMINENT" },
  { label: "25k-30k VIRTUOSE", value: "25k-30k_VIRTUOSE" },
];


export const ORACLE_PORTFOLIO_TIERS = [
  { label: "150k-300k PATRIMOINE", value: "150k-300k_PATRIMOINE" },
  { label: "300k-600k DYNASTIE", value: "300k-600k_DYNASTIE" },
  { label: "600k-1M EMPIRE", value: "600k-1M_EMPIRE" },
  { label: "1M-5M MAGNAT", value: "1M-5M_MAGNAT" },
  { label: "5M-10M TITAN", value: "5M-10M_TITAN" },
  { label: "10M-50M LEGENDE", value: "10M-50M_LEGENDE" },
  { label: "50M-75M OLYMPIEN", value: "50M-75M_OLYMPIEN" },
  { label: "75M-100M IMMORTEL", value: "75M-100M_IMMORTEL" },
  { label: "100M-200M PANTHEON", value: "100M-200M_PANTHEON" },
  { label: "200M-500M ABSOLU", value: "200M-500M_ABSOLU" },
];

import type { AgentType } from "@/types/agents";

export type PortfolioTier = { label: string; value: string };

export function getPortfolioTiers(agent: AgentType): PortfolioTier[] {
  if (agent === "oracle") return ORACLE_PORTFOLIO_TIERS;
  return DISCOVER_PORTFOLIO_TIERS;
}

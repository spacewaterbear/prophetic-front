"use client";

import { ChevronDown } from "lucide-react";
import { ModeCard } from "./CategoryButton";
import { AgentType } from "@/types/agents";
import { useI18n } from "@/contexts/i18n-context";
import { useStripePrices } from "@/contexts/stripe-prices-context";

interface ModeSelectorProps {
  selectedAgent: AgentType;
  availableAgents: AgentType[];
  isOpen: boolean;
  onToggle: () => void;
  onAgentClick: (agent: AgentType) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  mounted: boolean;
}

export function ModeSelector({
  selectedAgent,
  availableAgents,
  isOpen,
  onToggle,
  onAgentClick,
  onMouseEnter,
  onMouseLeave,
  mounted,
}: ModeSelectorProps) {
  const { t } = useI18n();
  const stripePrices = useStripePrices();
  return (
    <div className="static sm:relative flex-shrink-0">
      <button
        type="button"
        data-dashlane-ignore="true"
        className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span className="text-gray-900 dark:text-white font-medium text-sm capitalize truncate whitespace-nowrap">
          {selectedAgent}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-900 dark:text-white" />
      </button>

      {/* Desktop Dropdown */}
      <div
        className={`
          hidden sm:block
          absolute right-0 bottom-full mb-2
          transition-all duration-300 ease-out
          z-10
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="bg-white dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl p-5 w-full sm:w-[420px] shadow-2xl border-t border-gray-200 sm:border dark:border-transparent max-h-[80vh] overflow-y-auto">
          <ModeCard
            title="FLASH"
            price={t("agents.flashPrice")}
            description={t("agents.flashDesc")}
            isActive={selectedAgent === "flash"}
            isAvailable={availableAgents.includes("flash")}
            onClick={() => onAgentClick("flash")}
          />
          <ModeCard
            title="DISCOVER"
            price={t("agents.discoverPrice")}
            description={t("agents.discoverDesc")}
            isActive={selectedAgent === "discover"}
            isAvailable={true}
            onClick={() => onAgentClick("discover")}
          />
          <ModeCard
            title="INTELLIGENCE"
            price={stripePrices.intelligence ?? ""}
            description={t("agents.intelligenceDesc")}
            isActive={selectedAgent === "intelligence"}
            isAvailable={availableAgents.includes("intelligence")}
            onClick={() => onAgentClick("intelligence")}
          />
          <ModeCard
            title="ORACLE"
            price={stripePrices.oracle ?? ""}
            description={t("agents.oracleDesc")}
            isActive={selectedAgent === "oracle"}
            isAvailable={availableAgents.includes("oracle")}
            onClick={() => onAgentClick("oracle")}
          />
        </div>
      </div>

      {/* Mobile Bottom Sheet is rendered via portal from ChatInput */}
    </div>
  );
}

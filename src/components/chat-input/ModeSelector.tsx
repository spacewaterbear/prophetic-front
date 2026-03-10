"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { ModeCard } from "./CategoryButton";
import { AgentType } from "@/types/agents";
import { useI18n } from "@/contexts/i18n-context";

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
  return (
    <div className="static sm:relative flex-shrink-0">
      <button
        type="button"
        data-dashlane-ignore="true"
        className="flex items-center gap-2 bg-[#352ee8] hover:bg-[#2920c7] rounded-full px-3 py-2 transition-colors cursor-pointer max-w-[200px] sm:max-w-none"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Image
          src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
          alt="Prophetic"
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <span className="text-white font-medium text-sm capitalize truncate whitespace-nowrap">
          {selectedAgent}
        </span>
        <ChevronDown className="h-4 w-4 text-white" />
      </button>

      {/* Desktop Dropdown */}
      <div
        className={`
          hidden sm:block
          absolute left-0 bottom-full mb-2
          transition-all duration-300 ease-out
          z-10
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl p-5 w-full sm:w-[420px] shadow-2xl border-t border-gray-200 sm:border dark:border-transparent max-h-[80vh] overflow-y-auto">
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
            price="$29.99 / month"
            description={t("agents.intelligenceDesc")}
            isActive={selectedAgent === "intelligence"}
            isAvailable={availableAgents.includes("intelligence")}
            onClick={() => onAgentClick("intelligence")}
          />
          <ModeCard
            title="ORACLE"
            price="$149.99 / month"
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

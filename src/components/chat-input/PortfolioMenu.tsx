"use client";

import Image from "next/image";
import { CategoryButton } from "./CategoryButton";
import { AgentType } from "@/types/agents";
import {
  DISCOVER_PORTFOLIO_TIERS,
  INTELLIGENCE_PORTFOLIO_TIERS,
  ORACLE_PORTFOLIO_TIERS,
} from "@/lib/constants/portfolio-tiers";

interface PortfolioMenuProps {
  selectedAgent: AgentType;
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPortfolioClick: (tierName: string, subCategory: string) => void;
  mounted: boolean;
  isDark: boolean;
}

export function PortfolioMenu({
  selectedAgent,
  isOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  onPortfolioClick,
  mounted,
  isDark,
}: PortfolioMenuProps) {
  const tiers =
    selectedAgent === "oracle"
      ? ORACLE_PORTFOLIO_TIERS
      : selectedAgent === "intelligence"
        ? INTELLIGENCE_PORTFOLIO_TIERS
        : DISCOVER_PORTFOLIO_TIERS;

  return (
    <div className="hidden sm:block static sm:relative flex-shrink-0">
      <button
        className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full px-1 py-2.5 transition-colors"
        aria-label="Portfolio"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Image
          src={
            mounted && isDark
              ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/portfolio_b.svg"
              : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/portfolio.svg"
          }
          alt="Portfolio"
          width={24}
          height={24}
          className="w-9 h-9"
        />
      </button>

      {/* Portfolio Tiers Dropdown */}
      <div
        className={`
          absolute left-0 bottom-full mb-2
          transition-all duration-300 ease-out
          z-10
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[420px] shadow-2xl border dark:border-transparent">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Portfolio Strategies
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              Select your investment tier
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {tiers.map((tier) => (
              <CategoryButton
                key={tier.value}
                onClick={() => onPortfolioClick(tier.label, tier.value)}
              >
                {tier.label}
              </CategoryButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

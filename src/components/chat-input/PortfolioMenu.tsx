"use client";

import Image from "next/image";
import { CategoryButton } from "./CategoryButton";
import { AgentType } from "@/types/agents";
import { useI18n } from "@/contexts/i18n-context";
import { getPortfolioTiers } from "@/lib/constants/portfolio-tiers";
import { ICON_PORTFOLIO_DARK, ICON_PORTFOLIO_LIGHT } from "@/lib/constants/logos";

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
  const { t } = useI18n();
  const tiers = getPortfolioTiers(selectedAgent);

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
              ? ICON_PORTFOLIO_DARK
              : ICON_PORTFOLIO_LIGHT
          }
          alt="Portfolio"
          width={24}
          height={24}
          unoptimized
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
              {t("hub.portfolioTitle")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {t("hub.portfolioSubtitle")}
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

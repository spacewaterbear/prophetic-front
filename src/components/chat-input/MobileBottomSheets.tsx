"use client";

import Image from "next/image";
import { Paperclip } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { CategoryButton, CARD_BUTTON_STYLES, ModeCard } from "./CategoryButton";
import { AgentType } from "@/types/agents";
import {
  DISCOVER_PORTFOLIO_TIERS,
  INTELLIGENCE_PORTFOLIO_TIERS,
  ORACLE_PORTFOLIO_TIERS,
} from "@/lib/constants/portfolio-tiers";

const MOBILE_CATEGORIES = [
  "Contemp. Art",
  "Luxury Bags",
  "Prestigious Wines",
  "Precious Jewelry",
  "Luxury Watch",
  "Collectible Cars",
  "Limited Sneakers",
  "Rare Whiskey",
  "Real Estate",
  "US sports cards",
];

interface MobileBottomSheetsProps {
  // Mode selector
  isDropdownOpen: boolean;
  onCloseDropdown: () => void;
  selectedAgent: AgentType;
  availableAgents: AgentType[];
  onAgentClick: (agent: AgentType) => void;
  // File upload / hub menu
  isFileUploadOpen: boolean;
  onCloseFileUpload: () => void;
  mobileMenuLevel: "main" | "flashcards" | "ranking" | "portfolio";
  onMobileMenuLevelChange: (
    level: "main" | "flashcards" | "ranking" | "portfolio",
  ) => void;
  selectedCategory: string | null;
  onFlashcardClick: (
    category: string,
    flashCardType: "flash_invest" | "ranking",
  ) => void;
  onPortfolioClick: (tierName: string, subCategory: string) => void;
  // Chrono
  isChronoOpen: boolean;
  onCloseChono: () => void;
  // Settings
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  // Ranking
  isRankingOpen: boolean;
  onCloseRanking: () => void;
  // Common
  mounted: boolean;
  isDark: boolean;
}

export function MobileBottomSheets({
  isDropdownOpen,
  onCloseDropdown,
  selectedAgent,
  availableAgents,
  onAgentClick,
  isFileUploadOpen,
  onCloseFileUpload,
  mobileMenuLevel,
  onMobileMenuLevelChange,
  selectedCategory,
  onFlashcardClick,
  onPortfolioClick,
  isChronoOpen,
  onCloseChono,
  isSettingsOpen,
  onCloseSettings,
  isRankingOpen,
  onCloseRanking,
  mounted,
  isDark,
}: MobileBottomSheetsProps) {
  const { t } = useI18n();

  const tiers =
    selectedAgent === "oracle"
      ? ORACLE_PORTFOLIO_TIERS
      : selectedAgent === "intelligence"
        ? INTELLIGENCE_PORTFOLIO_TIERS
        : DISCOVER_PORTFOLIO_TIERS;

  return (
    <>
      {/* Mode Selector Bottom Sheet */}
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isDropdownOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onCloseDropdown}
      />
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isDropdownOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-5 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
          <ModeCard
            title="DISCOVER"
            price="Free"
            description="Explore assets. Spot trends"
            isActive={selectedAgent === "discover"}
            isAvailable={true}
            onClick={() => {
              onAgentClick("discover");
              setTimeout(onCloseDropdown, 150);
            }}
            isMobile={true}
          />
          <ModeCard
            title="INTELLIGENCE"
            price="$29.99 / month"
            description="Predict value. Invest smarter"
            isActive={selectedAgent === "intelligence"}
            isAvailable={availableAgents.includes("intelligence")}
            onClick={() => {
              onAgentClick("intelligence");
              setTimeout(onCloseDropdown, 150);
            }}
            isMobile={true}
          />
          <ModeCard
            title="ORACLE"
            price="$149.99 / month"
            description="Lead the market. Multiply wealth"
            isActive={selectedAgent === "oracle"}
            isAvailable={availableAgents.includes("oracle")}
            onClick={() => {
              onAgentClick("oracle");
              setTimeout(onCloseDropdown, 150);
            }}
            isMobile={true}
          />
        </div>
      </div>

      {/* File Upload / Hub Bottom Sheet */}
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isFileUploadOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => {
          onCloseFileUpload();
          onMobileMenuLevelChange("main");
        }}
      />
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isFileUploadOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
          {mobileMenuLevel === "main" && (
            <>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  Discovery Hub
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  Learn, compare, track
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  className={CARD_BUTTON_STYLES}
                  onClick={() => onMobileMenuLevelChange("flashcards")}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        mounted && isDark
                          ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/chrono_b.svg"
                          : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/chrono.svg"
                      }
                      alt="Flashcards"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span>Learn Flashcards</span>
                  </div>
                </button>
                <button
                  className={CARD_BUTTON_STYLES}
                  onClick={() => onMobileMenuLevelChange("ranking")}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        mounted && isDark
                          ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/ranking_b.svg"
                          : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/ranking.svg"
                      }
                      alt="Rankings"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span>Compare Rankings</span>
                  </div>
                </button>
                <button
                  className={CARD_BUTTON_STYLES}
                  onClick={() => onMobileMenuLevelChange("portfolio")}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        mounted && isDark
                          ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/portfolio_b.svg"
                          : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/portfolio.svg"
                      }
                      alt="Portfolio"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span>Track Portfolio</span>
                  </div>
                </button>
                <button
                  className="w-full flex items-center justify-between p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] text-gray-900 dark:text-white text-sm font-semibold rounded-2xl border border-gray-400/60 dark:border-gray-600/60 opacity-50 cursor-not-allowed"
                  disabled
                >
                  <div className="flex items-center gap-3">
                    <Paperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span>Upload file</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md">
                    {t("chat.comingSoon")}
                  </span>
                </button>
              </div>
            </>
          )}
          {mobileMenuLevel === "flashcards" && (
            <>
              <div className="mb-4">
                <button
                  onClick={() => onMobileMenuLevelChange("main")}
                  className="text-sm text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back
                </button>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  Learn Flashcards
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  Diversify your portfolio
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_CATEGORIES.map((cat) => (
                  <CategoryButton
                    key={cat}
                    isActive={selectedCategory === cat}
                    onClick={() => {
                      onFlashcardClick(cat, "flash_invest");
                      onCloseFileUpload();
                      onMobileMenuLevelChange("main");
                    }}
                  >
                    {cat}
                  </CategoryButton>
                ))}
              </div>
            </>
          )}
          {mobileMenuLevel === "ranking" && (
            <>
              <div className="mb-4">
                <button
                  onClick={() => onMobileMenuLevelChange("main")}
                  className="text-sm text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back
                </button>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  Compare Rankings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  Discover market leaders
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_CATEGORIES.map((cat) => (
                  <CategoryButton
                    key={cat}
                    isActive={selectedCategory === cat}
                    onClick={() => {
                      onFlashcardClick(cat, "ranking");
                      onCloseFileUpload();
                      onMobileMenuLevelChange("main");
                    }}
                  >
                    {cat}
                  </CategoryButton>
                ))}
              </div>
            </>
          )}
          {mobileMenuLevel === "portfolio" && (
            <>
              <div className="mb-4">
                <button
                  onClick={() => onMobileMenuLevelChange("main")}
                  className="text-sm text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back
                </button>
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
                    onClick={() => {
                      onPortfolioClick(tier.label, tier.value);
                      onCloseFileUpload();
                      onMobileMenuLevelChange("main");
                    }}
                  >
                    {tier.label}
                  </CategoryButton>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chrono Bottom Sheet */}
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isChronoOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onCloseChono}
      />
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isChronoOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Learn Flashcards
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              Diversify your portfolio
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MOBILE_CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat}
                isActive={selectedCategory === cat}
                onClick={() => onFlashcardClick(cat, "flash_invest")}
              >
                {cat}
              </CategoryButton>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Bottom Sheet */}
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isSettingsOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onCloseSettings}
      />
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isSettingsOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              Customize your experience
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl">
              <div className="flex items-center gap-3">
                <Image
                  src={
                    mounted && isDark
                      ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/scout_b.svg"
                      : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/scout_n.svg"
                  }
                  alt="Market Scout"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Market Scout{" "}
                    <sup className="text-[10px] font-bold">
                      {t("chat.comingSoon")}
                    </sup>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Les opportunités avant le marché
                  </div>
                </div>
              </div>
              <button
                disabled
                className="flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none"
              >
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl">
              <div className="flex items-center gap-3">
                <Image
                  src={
                    mounted && isDark
                      ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/radar_b.svg"
                      : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/radar_n.svg"
                  }
                  alt="Community Radar"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Community Radar{" "}
                    <sup className="text-[10px] font-bold">
                      {t("chat.comingSoon")}
                    </sup>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Le buzz social en signal d&apos;investissement
                  </div>
                </div>
              </div>
              <button
                disabled
                className="flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none"
              >
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Bottom Sheet */}
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isRankingOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onCloseRanking}
      />
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isRankingOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Compare Rankings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              Discover market leaders
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MOBILE_CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat}
                isActive={selectedCategory === cat}
                onClick={() => onFlashcardClick(cat, "ranking")}
              >
                {cat}
              </CategoryButton>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

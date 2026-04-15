"use client";

import Image from "next/image";
import { CategoryButton } from "./CategoryButton";
import { useI18n } from "@/contexts/i18n-context";
import {
  ICON_CHRONO_DARK,
  ICON_CHRONO_LIGHT,
  ICON_RANKING_DARK,
  ICON_RANKING_LIGHT,
} from "@/lib/constants/logos";

interface FlashcardMenuProps {
  type: "flashcard" | "ranking";
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  selectedCategory: string | null;
  onCategorySelect: (
    category: string,
    flashCardType: "flash_invest" | "ranking",
  ) => void;
  mounted: boolean;
  isDark: boolean;
}

import { FLASHCARD_CATEGORIES } from "@/lib/constants/categories";

export function FlashcardMenu({
  type,
  isOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  selectedCategory,
  onCategorySelect,
  mounted,
  isDark,
}: FlashcardMenuProps) {
  const { t } = useI18n();
  const isRanking = type === "ranking";
  const flashCardType = isRanking ? "ranking" : "flash_invest";
  const title = isRanking ? t("hub.compareRankings") : t("hub.learnFlashcards");
  const subtitle = isRanking
    ? t("hub.rankingsSubtitle")
    : t("hub.flashcardsSubtitle");

  const iconSrc = isRanking
    ? mounted && isDark
      ? ICON_RANKING_DARK
      : ICON_RANKING_LIGHT
    : mounted && isDark
      ? ICON_CHRONO_DARK
      : ICON_CHRONO_LIGHT;

  return (
    <div className="hidden sm:block static sm:relative flex-shrink-0">
      <button
        className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full px-1 py-2.5 transition-colors"
        aria-label={isRanking ? "Ranking" : "Chrono"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Image
          src={iconSrc}
          alt={isRanking ? "Ranking" : "Chrono"}
          width={24}
          height={24}
          unoptimized
          className="w-9 h-9"
        />
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
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[420px] shadow-2xl border dark:border-transparent">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {subtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {FLASHCARD_CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat.key}
                isActive={selectedCategory === cat.key}
                onClick={() => onCategorySelect(cat.key, flashCardType)}
              >
                {t(cat.translationKey)}
              </CategoryButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

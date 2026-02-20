"use client";

import Image from "next/image";
import { CategoryButton } from "./CategoryButton";

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

const ALL_CATEGORIES = [
  { label: "Contemporary Art", isArt: true },
  { label: "Prestigious Wines", isArt: false },
  { label: "Luxury Bags", isArt: false },
  { label: "Precious Jewelry", isArt: false },
  { label: "Luxury Watch", isArt: false },
  { label: "Collectible Cars", isArt: false },
  { label: "Limited Sneakers", isArt: false },
  { label: "Rare Whiskey", isArt: false },
  { label: "Real Estate", isArt: false },
  { label: "US sports cards", isArt: false },
];

const isArtSpeciality = process.env.NEXT_PUBLIC_SPECIALITY === "art";
const CATEGORIES = (
  isArtSpeciality ? ALL_CATEGORIES.filter((c) => c.isArt) : ALL_CATEGORIES
).map((c) => c.label);

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
  const isRanking = type === "ranking";
  const flashCardType = isRanking ? "ranking" : "flash_invest";
  const title = isRanking ? "Compare Rankings" : "Learn Flashcards";
  const subtitle = isRanking
    ? "Discover market leaders"
    : "Diversify your portfolio";

  const iconSrc = isRanking
    ? mounted && isDark
      ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/ranking_b.svg"
      : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/ranking.svg"
    : mounted && isDark
      ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/chrono_b.svg"
      : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/chrono.svg";

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
            {CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat}
                isActive={selectedCategory === cat}
                onClick={() => onCategorySelect(cat, flashCardType)}
              >
                {cat}
              </CategoryButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

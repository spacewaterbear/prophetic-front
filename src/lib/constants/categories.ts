export interface FlashcardCategory {
  /** Key used to look up FLASHCARD_MAPPING */
  key: string;
  /** i18n translation key for display label */
  translationKey: string;
  /** True if this category only appears in art-speciality builds */
  isArt: boolean;
}

export const ALL_FLASHCARD_CATEGORIES: FlashcardCategory[] = [
  { key: "Contemporary Art",  translationKey: "flashcardCategories.contemporaryArt",  isArt: true  },
  { key: "Prestigious Wines", translationKey: "flashcardCategories.prestigiousWines", isArt: false },
  { key: "Luxury Bags",       translationKey: "flashcardCategories.luxuryBags",        isArt: false },
  { key: "Precious Jewelry",  translationKey: "flashcardCategories.preciousJewelry",   isArt: false },
  { key: "Luxury Watch",      translationKey: "flashcardCategories.luxuryWatch",        isArt: false },
  { key: "Collectible Cars",  translationKey: "flashcardCategories.collectibleCars",   isArt: false },
  { key: "Limited Sneakers",  translationKey: "flashcardCategories.limitedSneakers",   isArt: false },
  { key: "Rare Whiskey",      translationKey: "flashcardCategories.rareWhiskey",        isArt: false },
  { key: "Real Estate",       translationKey: "flashcardCategories.realEstate",         isArt: false },
  { key: "US sports cards",   translationKey: "flashcardCategories.usSportsCards",      isArt: false },
];

const isArtSpeciality = process.env.NEXT_PUBLIC_SPECIALITY === "art";

/**
 * Filters any list of items that have an `isArt` boolean property.
 * Keeps all items in normal mode; keeps only art items in art-speciality mode.
 */
export function filterBySpeciality<T extends { isArt: boolean }>(items: T[]): T[] {
  return isArtSpeciality ? items.filter((item) => item.isArt) : items;
}

/** Pre-filtered list for the current build's speciality */
export const FLASHCARD_CATEGORIES: FlashcardCategory[] = filterBySpeciality(ALL_FLASHCARD_CATEGORIES);

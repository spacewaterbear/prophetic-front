"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ChevronDown } from "lucide-react";
import { CATEGORY_DISPLAY_NAMES } from "@/types/chat";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LETTER_LIMIT = 24;
const SEARCH_LIMIT = 48;

const AVAILABLE_CATEGORIES = [
  "WINE",
  "WHISKY",
  "SACS",
  "MONTRES_LUXE",
  "CARS",
  "SNEAKERS",
  "BIJOUX",
  "CARDS_US",
];

interface ProductRow {
  id: string;
  name: string;
  category: string;
  sub_category?: string | null;
}

// ── Per-letter section ────────────────────────────────────────────────────────

function LetterSection({
  letter,
  category,
  mountIndex,
  onItemClick,
  isScrollTarget,
  onScrollReady,
  onLoaded,
}: {
  letter: string;
  category: string;
  mountIndex: number;
  onItemClick: (item: ProductRow) => void;
  isScrollTarget: boolean;
  onScrollReady: (letter: string) => void;
  onLoaded: (letter: string, hasItems: boolean) => void;
}) {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initiated, setInitiated] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const initiatedRef = useRef(false);

  const fetchPage = useCallback(
    async (p: number, append = false) => {
      if (initiatedRef.current && p === 1) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/abcdaire?category=${category}&letter=${letter}&page=${p}&limit=${LETTER_LIMIT}`
        );
        if (!res.ok) throw new Error("fetch error");
        const data = await res.json();
        const rows: ProductRow[] = (data.items || []).map((a: ProductRow) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          sub_category: a.sub_category,
        }));
        setItems((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(data.hasMore ?? false);
        setPage(p);
        if (!append && rows.length === 0) setIsEmpty(true);
        if (!append) onLoaded(letter, rows.length > 0);
      } catch (err) {
        console.error(`[LetterSection ${letter}]`, err);
        if (!append) onLoaded(letter, false);
      } finally {
        setLoading(false);
        setInitiated(true);
        initiatedRef.current = true;
      }
    },
    [letter, category]
  );

  // Reset when category changes
  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(false);
    setInitiated(false);
    setIsEmpty(false);
    initiatedRef.current = false;
    const t = setTimeout(() => fetchPage(1), mountIndex * 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (!isScrollTarget || !initiated) return;
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        onScrollReady(letter);
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, [isScrollTarget, initiated, letter, onScrollReady]);

  if (initiated && isEmpty) return null;

  return (
    <section id={`letter-${letter}`} className="scroll-mt-4">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white w-8 shrink-0">
          {letter}
        </h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 mb-3 pl-11">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"
              style={{ width: `${55 + (i % 3) * 15}%` }}
            />
          ))}
        </div>
      ) : isEmpty ? null : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 mb-3 pl-11">
          {items.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              title={[item.sub_category, item.name].filter(Boolean).join(" ")}
              onClick={() => onItemClick(item)}
              className="text-left text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline underline-offset-2 py-0.5 transition-colors truncate"
            >
              {[item.sub_category, item.name].filter(Boolean).join(" ")}
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="pl-11 mb-2">
          <button
            onClick={() => fetchPage(page + 1, true)}
            disabled={loading}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2 transition-colors disabled:opacity-40"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      <div className="mb-8" />
    </section>
  );
}

// ── Search results ────────────────────────────────────────────────────────────

function SearchResults({
  query,
  category,
  onItemClick,
}: {
  query: string;
  category: string;
  onItemClick: (item: ProductRow) => void;
}) {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const run = useCallback(async (q: string, cat: string, p: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const qs = new URLSearchParams({
        category: cat,
        search: q,
        page: String(p),
        limit: String(SEARCH_LIMIT),
      });
      const res = await fetch(`/api/abcdaire?${qs}`);
      if (!res.ok) throw new Error("fetch error");
      const data = await res.json();
      const rows: ProductRow[] = (data.items || []).map((a: ProductRow) => ({ id: a.id, name: a.name, category: a.category, sub_category: a.sub_category }));
      setItems((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setPage(p);
    } catch (err) {
      console.error("[Products search]", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (query) run(query, category, 1);
  }, [query, category, run]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"
            style={{ width: `${55 + (i % 3) * 15}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
        {total.toLocaleString()} résultat{total !== 1 ? "s" : ""} pour &ldquo;
        {query}&rdquo;
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aucun produit trouvé.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 mb-6">
            {items.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                title={[item.sub_category, item.name].filter(Boolean).join(" ")}
                onClick={() => onItemClick(item)}
                className="text-left text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline underline-offset-2 py-0.5 transition-colors truncate"
              >
                {[item.sub_category, item.name].filter(Boolean).join(" ")}
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => run(query, category, page + 1, true)}
              disabled={loadingMore}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2 transition-colors disabled:opacity-40"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "WINE";
  const lockedCategory = searchParams.get("category") !== null;
  const labelOverride = searchParams.get("label");

  const [category, setCategory] = useState(initialCategory);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [emptyLetters, setEmptyLetters] = useState<Set<string>>(new Set());

  const handleLetterLoaded = useCallback((letter: string, hasItems: boolean) => {
    if (!hasItems) {
      setEmptyLetters((prev) => new Set([...prev, letter]));
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(timerRef.current);
    if (!value.trim()) {
      setDebouncedSearch("");
      return;
    }
    timerRef.current = setTimeout(() => setDebouncedSearch(value.trim()), 300);
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
  };

  const scrollToLetter = (letter: string) => {
    setScrollTarget(letter);
  };

  const handleScrollReady = useCallback((letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    const container = scrollRef.current;
    if (!el || !container) return;
    const elTop = el.getBoundingClientRect().top;
    const containerTop = container.getBoundingClientRect().top;
    container.scrollTo({
      top: container.scrollTop + elTop - containerTop - 16,
      behavior: "smooth",
    });
    setScrollTarget(null);
  }, []);

  const handleItemClick = useCallback(
    (item: ProductRow) => {
      sessionStorage.setItem("pendingProductSearch", JSON.stringify({ id: item.id, name: item.name, sub_category: item.sub_category, category: item.category }));
      router.push("/chat");
    },
    [router]
  );

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setCategoryOpen(false);
    clearSearch();
    setScrollTarget(null);
    setEmptyLetters(new Set());
  };

  const isSearching = debouncedSearch.length > 0;
  const categoryLabel =
    labelOverride ??
    CATEGORY_DISPLAY_NAMES[category] ??
    category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
      {/* ── Header ── */}
      <div className="flex-shrink-0 pl-14 pr-6 md:px-6 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {categoryLabel}
        </h1>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Category selector */}
          {!lockedCategory && <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setCategoryOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            >
              <span>{categoryLabel}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {categoryOpen && (
              <div className="absolute top-full mt-1 left-0 z-20 min-w-[180px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const label =
                    CATEGORY_DISPLAY_NAMES[cat] ??
                    cat
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(" ");
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        cat === category
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>}

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-colors"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* A–Z jump links */}
        {!isSearching && (
          <div className="flex flex-wrap gap-0.5">
            {LETTERS.filter((l) => !emptyLetters.has(l)).map((l) => (
              <button
                key={l}
                onClick={() => scrollToLetter(l)}
                disabled={scrollTarget !== null}
                className="w-7 h-7 rounded text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40"
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scroll area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {isSearching ? (
          <SearchResults
            query={debouncedSearch}
            category={category}
            onItemClick={handleItemClick}
          />
        ) : (
          LETTERS.map((l, i) => (
            <LetterSection
              key={`${l}-${category}`}
              letter={l}
              category={category}
              mountIndex={i}
              onItemClick={handleItemClick}
              isScrollTarget={scrollTarget === l}
              onScrollReady={handleScrollReady}
              onLoaded={handleLetterLoaded}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}

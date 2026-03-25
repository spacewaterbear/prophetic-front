"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCredits } from "@/hooks/useCredits";
import { useI18n } from "@/contexts/i18n-context";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LETTER_LIMIT = 24;
const SEARCH_LIMIT = 48;

interface ArtistRow {
  artist_name: string;
  primary_country: string | null;
  country_iso_code: string | null;
}

// ── Per-letter section ────────────────────────────────────────────────────────

function LetterSection({
  letter,
  mountIndex,
  onArtistClick,
  isScrollTarget,
  onScrollReady,
}: {
  letter: string;
  mountIndex: number;
  onArtistClick: (name: string) => void;
  isScrollTarget: boolean;
  onScrollReady: (letter: string) => void;
}) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
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
          `/api/artists?letter=${letter}&page=${p}&limit=${LETTER_LIMIT}`
        );
        if (!res.ok) throw new Error("fetch error");
        const data = await res.json();
        const rows: ArtistRow[] = (data.artists || []).map((a: ArtistRow) => ({
          artist_name: a.artist_name,
          primary_country: a.primary_country ?? null,
          country_iso_code: a.country_iso_code ?? null,
        }));
        setArtists((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(data.hasMore ?? false);
        setPage(p);
        if (!append && rows.length === 0) setIsEmpty(true);
      } catch (err) {
        console.error(`[LetterSection ${letter}]`, err);
      } finally {
        setLoading(false);
        setInitiated(true);
        initiatedRef.current = true;
      }
    },
    [letter]
  );

  // Eagerly load on mount, staggered by letter index to avoid hammering the DB
  useEffect(() => {
    const t = setTimeout(() => fetchPage(1), mountIndex * 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once loaded AND we're the scroll target → notify parent to scroll
  // Double-RAF ensures the browser has painted the fully-expanded layout
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

  return (
    <section id={`letter-${letter}`} className="scroll-mt-4">
      {/* Letter heading — always in DOM so the anchor is always reachable */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white w-8 shrink-0">
          {letter}
        </h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Artist names */}
      {loading && artists.length === 0 ? (
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
          {artists.map((artist, i) => (
            <button
              key={`${artist.artist_name}-${i}`}
              title={artist.artist_name}
              onClick={() => onArtistClick(artist.artist_name)}
              className="text-left text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline underline-offset-2 py-0.5 transition-colors flex items-baseline gap-1.5 min-w-0"
            >
              <span className="truncate">{artist.artist_name}</span>
              {artist.primary_country && (
                <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 font-normal no-underline">
                  {artist.primary_country}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Per-letter load more */}
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
  onArtistClick,
}: {
  query: string;
  onArtistClick: (name: string) => void;
}) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const run = useCallback(async (q: string, p: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const qs = new URLSearchParams({
        search: q,
        page: String(p),
        limit: String(SEARCH_LIMIT),
      });
      const res = await fetch(`/api/artists?${qs}`);
      if (!res.ok) throw new Error("fetch error");
      const data = await res.json();
      const rows: ArtistRow[] = (data.artists || []).map((a: ArtistRow) => ({
        artist_name: a.artist_name,
        primary_country: a.primary_country ?? null,
        country_iso_code: a.country_iso_code ?? null,
      }));
      setArtists((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setPage(p);
    } catch (err) {
      console.error("[Artists search]", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (query) run(query, 1);
  }, [query, run]);

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
        {total.toLocaleString()} result{total !== 1 ? "s" : ""} for &ldquo;
        {query}&rdquo;
      </p>
      {artists.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No artists found.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 mb-6">
            {artists.map((artist, i) => (
              <button
                key={`${artist.artist_name}-${i}`}
                title={artist.artist_name}
                onClick={() => onArtistClick(artist.artist_name)}
                className="text-left text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline underline-offset-2 py-0.5 transition-colors flex items-baseline gap-1.5 min-w-0"
              >
                <span className="truncate">{artist.artist_name}</span>
                {artist.primary_country && (
                  <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 font-normal no-underline">
                    {artist.primary_country}
                  </span>
                )}
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => run(query, page + 1, true)}
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

export default function ArtistsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useI18n();
  const userStatus = (session?.user as { status?: string })?.status;
  const isFreeUser = userStatus === "free";
  const canClickItems = userStatus === "oracle" || userStatus === "discover" || userStatus === "admini";
  const { creditsExhausted } = useCredits(session?.user?.id, isFreeUser);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // The letter currently waiting to be scrolled to (null = none)
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

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

  // Called by the parent when the user clicks a letter button
  const scrollToLetter = (letter: string) => {
    setScrollTarget(letter);
  };

  // Called by LetterSection after its data is loaded and the DOM has painted
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

  const handleArtistClick = useCallback(
    (name: string) => {
      sessionStorage.setItem("pendingDeepSearch", name);
      router.push("/chat");
    },
    [router]
  );

  const isSearching = debouncedSearch.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
      {/* ── Header ── */}
      <div className="flex-shrink-0 pl-14 pr-6 md:px-6 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Créations d&apos;exception
        </h1>

        {/* Search */}
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search an artist…"
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

        {/* A–Z jump links */}
        {!isSearching && (
          <div className="flex flex-wrap gap-0.5">
            {LETTERS.map((l) => (
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
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className={`h-full overflow-y-auto px-6 py-6 ${creditsExhausted || !canClickItems ? "opacity-40 pointer-events-none select-none" : ""}`}>
          {isSearching ? (
            <SearchResults
              query={debouncedSearch}
              onArtistClick={handleArtistClick}
            />
          ) : (
            LETTERS.map((l, i) => (
              <LetterSection
                key={l}
                letter={l}
                mountIndex={i}
                onArtistClick={handleArtistClick}
                isScrollTarget={scrollTarget === l}
                onScrollReady={handleScrollReady}
              />
            ))
          )}
        </div>
        {!canClickItems && !creditsExhausted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-auto backdrop-blur-sm bg-[rgb(249,248,244)]/60 dark:bg-[rgb(1,1,0)]/60">
            <div className="flex flex-col items-center gap-3 bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-700 rounded-2xl px-8 py-6 shadow-xl max-w-xs mx-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white text-center">{t("credits.planRequiredTitle")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{t("credits.planRequiredMessage")}</p>
              <a href="/pricing" className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full bg-[#372ee9] hover:bg-[#2a22c7] text-white transition-colors">
                {t("credits.choosePlan")}
              </a>
            </div>
          </div>
        )}
        {creditsExhausted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-auto backdrop-blur-sm bg-[rgb(249,248,244)]/60 dark:bg-[rgb(1,1,0)]/60">
            <div className="flex flex-col items-center gap-3 bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-700 rounded-2xl px-8 py-6 shadow-xl max-w-xs mx-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white text-center">{t("credits.exhaustedTitle")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{t("credits.exhaustedMessage")}</p>
              <a href="/pricing" className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full bg-[#372ee9] hover:bg-[#2a22c7] text-white transition-colors">
                {t("credits.choosePlan")}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

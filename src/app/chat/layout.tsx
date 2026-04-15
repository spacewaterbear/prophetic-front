"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  MessageCircleHeart,
  Palette,
  ArrowUpCircle,
} from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { useSidebar, SidebarProvider } from "@/contexts/sidebar-context";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SelectionContextMenu } from "@/components/SelectionContextMenu";
import { FeedbackModal } from "@/components/FeedbackModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getCategoryDisplayNames } from "@/lib/translations";
import { ICON_CONVERSATIONS_DARK, ICON_CONVERSATIONS_LIGHT, ICONS_BASE_URL, LOGO_LIGHT, LOGO_DARK, LOGO_SMALL_LIGHT, LOGO_SMALL_DARK } from "@/lib/constants/logos";

const STORAGE = ICONS_BASE_URL;

const IS_ART_SPECIALITY = process.env.NEXT_PUBLIC_SPECIALITY === "art";
const IS_MAIN_SPECIALITY = process.env.NEXT_PUBLIC_SPECIALITY === "main" || !process.env.NEXT_PUBLIC_SPECIALITY;

const MAIN_CATEGORY_ORDER = [
  "MARCHE_SPOT",
  "CASH_FLOW_LEASING",
  "ART_CONTEMPORAIN",
  "WINE",
  "IMMO_LUXE",
  "MONTRES_LUXE",
  "CARS",
  "SNEAKERS",
  "WHISKY",
  "BIJOUX",
  "CARDS_US",
  "SACS",
  "ART_TRADING_VALUE",
];

// Icons for known categories in main mode
const MAIN_CATEGORY_ICONS: Record<string, { light: string; dark: string }> = {
  ART_TRADING_VALUE: { light: `${STORAGE}/book_n.svg`, dark: `${STORAGE}/book_b.svg` },
  CASH_FLOW_LEASING: { light: `${STORAGE}/coin_n.svg`, dark: `${STORAGE}/coin_b.svg` },
  MARCHE_SPOT: { light: `${STORAGE}/stars_n.svg`, dark: `${STORAGE}/stars_b.svg` },
};

const ART_CATEGORY_ORDER = [
  "MARCHE_SPOT",
  "ART",
  "CLASSIQUES",
  "MODERNES",
  "SURREALISME",
  "POST-WAR",
  "POP_ART",
  "FIGURATIF",
  "STREET_ART",
  "EMERGENTS",
  "ART_TRADING_VALUE",
];

// Icons for known categories in art mode
const ART_CATEGORY_ICONS: Record<string, { light: string; dark: string }> = {
  ART_TRADING_VALUE: { light: `${STORAGE}/book_n.svg`, dark: `${STORAGE}/book_b.svg` },
  CASH_FLOW_LEASING: { light: `${STORAGE}/coin_n.svg`, dark: `${STORAGE}/coin_b.svg` },
  MARCHE_SPOT: { light: `${STORAGE}/stars_n.svg`, dark: `${STORAGE}/stars_b.svg` },
};

function getCategoryLabel(category: string, categoryNames: Record<string, string>): string {
  return (
    categoryNames[category] ??
    category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
}

interface Conversation {
  id: number;
  title: string | null;
  model: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function ChatLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const categoryNames = getCategoryDisplayNames(language);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { sidebarOpen, setSidebarOpen, isMobile, conversationsVersion } = useSidebar();
  const [consultationsExpanded, setConsultationsExpanded] = useState(false);
  const [artCategories, setArtCategories] = useState<string[]>([]);
  const [mainCategories, setMainCategories] = useState<string[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [conversationPage, setConversationPage] = useState(1);
  const CONVERSATIONS_PER_PAGE = 20;

  // Extract conversation ID from pathname
  const currentConversationId = pathname?.match(/\/chat\/(\d+)/)?.[1];
  const conversationId = currentConversationId
    ? parseInt(currentConversationId, 10)
    : null;

  // Load conversations once on mount
  useEffect(() => {
    if (session?.user) {
      loadConversations();
    }
  }, [session]);

  // Fetch art categories dynamically from Supabase when SPECIALITY=art
  useEffect(() => {
    if (!IS_ART_SPECIALITY) return;
    fetch("/api/sidebar-categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          const sorted = [...data.categories].sort((a, b) => {
            const ia = ART_CATEGORY_ORDER.indexOf(a);
            const ib = ART_CATEGORY_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });
          setArtCategories(sorted);
        }
      })
      .catch((err) => console.error("Failed to load art categories:", err));
  }, []);

  // Fetch main categories dynamically from Supabase when SPECIALITY=main
  useEffect(() => {
    if (!IS_MAIN_SPECIALITY) return;
    fetch("/api/sidebar-categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          const sorted = [...data.categories].sort((a, b) => {
            const ia = MAIN_CATEGORY_ORDER.indexOf(a);
            const ib = MAIN_CATEGORY_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });
          setMainCategories(sorted);
        }
      })
      .catch((err) => console.error("Failed to load main categories:", err));
  }, []);

  // Responsive sidebar behavior is now handled by SidebarContext

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error("Failed to load conversations:", response.status);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const createNewConversation = () => {
    // Just redirect to the welcome screen
    // Conversation will be created when user sends their first message
    router.push("/chat");
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));

        // If we deleted the current conversation, redirect to home
        if (conversationId === id) {
          router.push("/");
        }
      } else {
        console.error("Failed to delete conversation:", response.status);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Reload conversation list when a child component signals a new conversation was created
  useEffect(() => {
    if (conversationsVersion > 0) loadConversations();
  }, [conversationsVersion]);

  // Listen for closeSidebar event to close sidebar on mobile
  useEffect(() => {
    const handleCloseSidebar = () => {
      const isMobileView = window.innerWidth < 768;
      if (isMobileView) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("closeSidebar", handleCloseSidebar);
    return () => {
      window.removeEventListener("closeSidebar", handleCloseSidebar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="main-container bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"} md:w-64 transition-all duration-300 bg-[#f0eee6] dark:bg-[#1e1f20] text-gray-900 dark:text-white flex flex-col overflow-hidden fixed md:relative h-full z-50 md:z-auto`}
      >
        {/* Logo */}
        <Link href="/chat" className="h-[56px] px-4 pt-3 flex items-start gap-2">
          <Image src={LOGO_SMALL_LIGHT} alt="Logo" width={22} height={22} unoptimized priority className="flex-shrink-0 block dark:hidden" />
          <Image src={LOGO_SMALL_DARK} alt="Logo" width={22} height={22} unoptimized priority className="flex-shrink-0 hidden dark:block" />
          <div className="flex items-start gap-1 leading-none">
            <span className="font-[family-name:var(--font-spectral)] font-semibold text-gray-900 dark:text-white text-lg leading-tight">
              {process.env.NEXT_PUBLIC_SPECIALITY === "art" ? "Art Orchestra" : "Prophetic Orchestra"}
            </span>
            <span className="text-[10px] font-medium self-start leading-none" style={{ color: "#372ee9" }}>beta</span>
          </div>
        </Link>

        <div className="px-4 pb-4">
          <Button
            className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-full border-0 font-normal py-6 text-base dark:bg-white/10 dark:hover:bg-white/20"
            onClick={createNewConversation}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t("nav.newChat")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div>
            {/* Consultations Section - Contains conversation history */}
            <div>
              <button
                onClick={() => setConsultationsExpanded(!consultationsExpanded)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-600/10 dark:hover:bg-white/5 text-sm transition-colors flex items-center gap-2"
              >
                <Image
                  src={ICON_CONVERSATIONS_LIGHT}
                  alt="Conversations"
                  width={20}
                  height={20}
                  unoptimized
                  className="flex-shrink-0 block dark:hidden"
                />
                <Image
                  src={ICON_CONVERSATIONS_DARK}
                  alt="Conversations"
                  width={20}
                  height={20}
                  unoptimized
                  className="flex-shrink-0 hidden dark:block"
                />
                <span className="flex-1">{t("nav.conversations")}</span>
                {consultationsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Conversation History */}
              {consultationsExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {conversations.length === 0 ? (
                    <div className="text-xs text-gray-500 dark:text-gray-500 px-3 py-2">
                      {t("nav.noConversations")}
                    </div>
                  ) : (
                    <>
                      {conversations.slice(0, conversationPage * CONVERSATIONS_PER_PAGE).map((conversation) => (
                        <div key={conversation.id} className="relative group">
                          <button
                            onClick={() =>
                              router.push(`/chat/${conversation.id}`)
                            }
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                              conversationId === conversation.id
                                ? "bg-gray-700 border border-gray-600 shadow-sm text-white dark:bg-white/20 dark:border-white/30"
                                : "hover:bg-gray-600/20 border border-transparent dark:hover:bg-white/5"
                            }`}
                          >
                            <MessageSquare
                              className={`h-3 w-3 flex-shrink-0 ${
                                conversationId === conversation.id
                                  ? "text-gray-300 dark:text-gray-400"
                                  : ""
                              }`}
                            />
                            <span
                              className={`truncate text-xs ${
                                conversationId === conversation.id
                                  ? "font-medium"
                                  : ""
                              }`}
                            >
                              {conversation.title}
                            </span>
                          </button>
                          <button
                            onClick={(e) =>
                              deleteConversation(conversation.id, e)
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                            aria-label="Delete conversation"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {conversations.length > conversationPage * CONVERSATIONS_PER_PAGE && (
                        <button
                          onClick={() => setConversationPage((p) => p + 1)}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          {t("nav.showMore")}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>


            {/* Marché Spot — art speciality only, before Artistes */}
            {IS_ART_SPECIALITY && artCategories.slice(0, 1).map((category) => {
              const isRevélations = IS_ART_SPECIALITY && category === "ART_CONTEMPORAIN";
              const label = isRevélations ? "Révélations" : getCategoryLabel(category, categoryNames);
              const urlParam = isRevélations ? "Révélations" : category;
              return (
                <button
                  key={category}
                  onClick={() => {
                    router.push(`/chat?category=${urlParam}`, { scroll: false });
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    activeCategory === urlParam
                      ? "bg-gray-600/20 dark:bg-white/10 font-medium text-gray-900 dark:text-white"
                      : "hover:bg-gray-600/10 dark:hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}

            {/* Artists Directory — art speciality only */}
            {IS_ART_SPECIALITY && <button
              onClick={() => {
                router.push("/chat/artists");
                if (isMobile) setSidebarOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 hover:bg-gray-600/10 dark:hover:bg-white/5 text-sm transition-colors flex items-center gap-2 ${
                pathname === "/chat/artists" ? "font-medium" : ""
              }`}
            >
              <Palette className="h-4 w-4 flex-shrink-0" />
              <span>{t("nav.artists")}</span>
            </button>}

            {/* Investment Categories */}
            {(IS_ART_SPECIALITY ? artCategories.slice(1) : mainCategories).map((category) => {
                const isRevélations = IS_ART_SPECIALITY && category === "ART_CONTEMPORAIN";
                const label = isRevélations ? "Révélations" : getCategoryLabel(category, categoryNames);
                const urlParam = isRevélations ? "REVELATIONS" : category;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      router.push(`/chat?category=${urlParam}`, { scroll: false });
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      activeCategory === urlParam
                        ? "bg-gray-600/20 dark:bg-white/10 font-medium text-gray-900 dark:text-white"
                        : "hover:bg-gray-600/10 dark:hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                );
              })
            }
          </div>
        </div>

        <div className="px-4 pb-2 pt-3 border-t border-gray-400 dark:border-gray-800">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-600/30 dark:hover:bg-white/10 text-sm transition-all flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <MessageCircleHeart className="h-4 w-4 flex-shrink-0" />
            <span>{t("nav.feedback")}</span>
          </button>
          <div className="mt-2 flex flex-col gap-1.5 px-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("nav.currentPlan")}:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200 capitalize">
                {session?.user?.status && session.user.status !== "unauthorized"
                  ? session.user.status
                  : "free"}
              </span>
            </span>
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md bg-[#372ee9] hover:bg-[#2a22c7] text-white transition-colors"
            >
              <ArrowUpCircle className="h-3 w-3" />
              {t("nav.upgrade")}
            </Link>
          </div>
        </div>

        <div className="px-4 pb-4">
          {!session?.user && (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-1 text-sm font-medium px-3 py-2 rounded-lg bg-[#372ee9] hover:bg-[#2a22c7] text-white transition-colors"
              >
                {t("nav.signIn")}
              </Link>
            </div>
          )}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full px-3 py-2 rounded-lg bg-gray-600/20 dark:bg-white/5 hover:bg-gray-600/30 dark:hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-white/10 flex items-center justify-center text-white font-medium text-sm">
                      {session.user.name?.[0]?.toUpperCase() ||
                        session.user.email?.[0]?.toUpperCase() ||
                        "U"}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-white truncate">
                        {session.user.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white dark:bg-[#1e1f20] border-gray-300 dark:border-gray-700"
              >
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 focus:bg-gray-100 dark:focus:bg-white/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* Main content area with menu button */}
      <ErrorBoundary name="ChatMain">
        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
          <div className="absolute top-2 left-3 z-20 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="backdrop-blur-sm h-10 w-10 bg-[#f9f8f4] dark:bg-[rgb(1,1,0)]"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          {children}
        </div>
      </ErrorBoundary>
      <SelectionContextMenu />
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        userId={session?.user?.id ?? undefined}
      />
    </div>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <ChatLayoutInner>{children}</ChatLayoutInner>
      </Suspense>
    </SidebarProvider>
  );
}

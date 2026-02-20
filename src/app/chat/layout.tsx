"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { useSidebar, SidebarProvider } from "@/contexts/sidebar-context";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SelectionContextMenu } from "@/components/SelectionContextMenu";
import { CATEGORY_DISPLAY_NAMES } from "@/types/chat";

const STORAGE = "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons";

const IS_ART_SPECIALITY = process.env.NEXT_PUBLIC_SPECIALITY === "art";

// Hardcoded list used only for SPECIALITY=main
const MAIN_CATEGORY_DEFS: {
  label: string;
  category: string;
  iconLight?: string;
  iconDark?: string;
}[] = [
  { label: "Marché de l'Art", category: "ART" },
  { label: "Vins Patrimoniaux", category: "WINE" },
  { label: "Sacs de Luxe", category: "SACS" },
  { label: "Immobilier de Prestige", category: "IMMO_LUXE" },
  { label: "Montres Iconiques", category: "MONTRES_LUXE" },
  { label: "Voitures de Collection", category: "CARS" },
  { label: "Sneakers Heritage", category: "SNEAKERS" },
  { label: "Whisky Rares", category: "WHISKY" },
  { label: "Bijoux Précieux", category: "BIJOUX" },
  { label: "Cartes Sportives", category: "CARDS_US" },
  { label: "Art Trading Value", category: "ART_TRADING_VALUE", iconLight: `${STORAGE}/book_n.svg`, iconDark: `${STORAGE}/book_b.svg` },
  { label: "Cash-Flow Leasing", category: "CASH_FLOW_LEASING", iconLight: `${STORAGE}/coin_n.svg`, iconDark: `${STORAGE}/coin_b.svg` },
  { label: "Marché spot", category: "MARCHE_SPOT", iconLight: `${STORAGE}/stars_n.svg`, iconDark: `${STORAGE}/stars_b.svg` },
];

const ART_CATEGORY_ORDER = [
  "CLASSIQUES",
  "MODERNES",
  "SURREALISME",
  "POST-WAR",
  "POP_ART",
  "FIGURATION",
  "STREET_ART",
  "EMERGENTS",
];

// Icons for known categories in art mode
const ART_CATEGORY_ICONS: Record<string, { light: string; dark: string }> = {
  ART_TRADING_VALUE: { light: `${STORAGE}/book_n.svg`, dark: `${STORAGE}/book_b.svg` },
  CASH_FLOW_LEASING: { light: `${STORAGE}/coin_n.svg`, dark: `${STORAGE}/coin_b.svg` },
  MARCHE_SPOT: { light: `${STORAGE}/stars_n.svg`, dark: `${STORAGE}/stars_b.svg` },
};

function getCategoryLabel(category: string): string {
  return (
    CATEGORY_DISPLAY_NAMES[category] ??
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
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const [consultationsExpanded, setConsultationsExpanded] = useState(false);
  const [artCategories, setArtCategories] = useState<string[]>([]);

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

  // When SPECIALITY=art, auto-redirect /chat to the first loaded art category
  useEffect(() => {
    if (IS_ART_SPECIALITY && pathname === "/chat" && artCategories.length > 0) {
      router.replace(`/chat?category=${artCategories[0]}`, { scroll: false });
    }
  }, [pathname, router, artCategories]);

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

  // Expose refresh function to child components via custom event
  useEffect(() => {
    const handleRefreshConversations = () => {
      loadConversations();
    };

    window.addEventListener("refreshConversations", handleRefreshConversations);
    return () => {
      window.removeEventListener(
        "refreshConversations",
        handleRefreshConversations,
      );
    };
  }, []);

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
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 bg-[rgb(230,220,210)] dark:bg-[#1e1f20] text-gray-900 dark:text-white flex flex-col overflow-hidden fixed md:relative h-full z-50 md:z-auto`}
      >
        <div className="h-[52px] sm:h-[60px] px-4 border-b border-gray-400 dark:border-gray-800 flex items-center">
          <Button
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-lg dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20"
            onClick={createNewConversation}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("nav.newChat")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {/* Consultations Section - Contains conversation history */}
            <div>
              <button
                onClick={() => setConsultationsExpanded(!consultationsExpanded)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-600/30 dark:hover:bg-white/10 text-sm transition-all flex items-center gap-2"
              >
                <Image
                  src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/consultations_n.svg"
                  alt="Conversations"
                  width={20}
                  height={20}
                  className="flex-shrink-0 block dark:hidden"
                />
                <Image
                  src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/consultations_b.svg"
                  alt="Conversations"
                  width={20}
                  height={20}
                  className="flex-shrink-0 hidden dark:block"
                />
                <span className="flex-1">Conversations</span>
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
                    conversations.map((conversation) => (
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
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Investment Categories */}
            {IS_ART_SPECIALITY
              ? artCategories.map((category) => {
                  const icons = ART_CATEGORY_ICONS[category];
                  const label = getCategoryLabel(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        router.push(`/chat?category=${category}`, { scroll: false });
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-600/30 dark:hover:bg-white/10 text-sm transition-all flex items-center gap-2"
                      style={{ lineHeight: "15px" }}
                    >
                      {icons && (
                        <>
                          <Image src={icons.light} alt={label} width={22} height={22} className="flex-shrink-0 block dark:hidden" />
                          <Image src={icons.dark} alt={label} width={22} height={22} className="flex-shrink-0 hidden dark:block" />
                        </>
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })
              : MAIN_CATEGORY_DEFS.map(({ label, category, iconLight, iconDark }) => (
                  <button
                    key={category}
                    onClick={() => {
                      router.push(`/chat?category=${category}`, { scroll: false });
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-600/30 dark:hover:bg-white/10 text-sm transition-all flex items-center gap-2"
                    style={{ lineHeight: "15px" }}
                  >
                    {iconLight && iconDark && (
                      <>
                        <Image src={iconLight} alt={label} width={22} height={22} className="flex-shrink-0 block dark:hidden" />
                        <Image src={iconDark} alt={label} width={22} height={22} className="flex-shrink-0 hidden dark:block" />
                      </>
                    )}
                    <span>{label}</span>
                  </button>
                ))
            }
          </div>
        </div>

        <div className="p-4 border-t border-gray-400 dark:border-gray-800">
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
      <div className="flex-1 flex flex-col overflow-hidden">
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
      <SelectionContextMenu />
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
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </SidebarProvider>
  );
}

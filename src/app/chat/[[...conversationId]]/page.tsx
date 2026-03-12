"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useSidebar } from "@/contexts/sidebar-context";
import { DEFAULT_NON_ADMIN_MODEL } from "@/lib/models";
import { VignetteData } from "@/types/vignettes";
import { useChatConversation } from "@/hooks/useChatConversation";
import { getAvailableAgents, AgentType } from "@/types/agents";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { ConversationView } from "@/components/chat/ConversationView";
import { VignetteDetailView } from "./VignetteDetailView";

const isAdminUser = (
  session: { user?: { status?: string } } | null,
): boolean => {
  return session?.user?.status === "admini";
};

const getImageNameFromUrl = (url: string): string => {
  const parts = url.split("/");
  return parts[parts.length - 1];
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const { t } = useI18n();

  const conversationIdParam = params.conversationId as string[] | undefined;
  const conversationId = conversationIdParam?.[0]
    ? parseInt(conversationIdParam[0], 10)
    : null;

  const [mounted, setMounted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(
    DEFAULT_NON_ADMIN_MODEL,
  );
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedAgent");
      if (saved && ["discover", "flash", "intelligence", "oracle"].includes(saved)) {
        return saved as AgentType;
      }
    }
    return "flash";
  });
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const { setSidebarOpen } = useSidebar();

  // Vignette state
  const [vignettes, setVignettes] = useState<VignetteData[]>([]);
  const [vignetteLoading, setVignetteLoading] = useState(false);
  const [vignetteError, setVignetteError] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    isLoading,
    streamingMessage,
    streamingMarketplaceData,
    streamingRealEstateData,
    streamingVignetteData,
    streamingClothesSearchData,
    streamingVignetteCategory,
    currentStatus,
    showStreamingIndicator,
    messagesEndRef,
    messagesContainerRef,
    disableAutoScrollRef,
    handleSend,
    handleFlashcardClick,
    handleScroll,
    clearMessages,
  } = useChatConversation({ conversationId, selectedModel, selectedAgent });

  useEffect(() => {
    const handleDeepSearch = (e: CustomEvent<{ text?: string }>) => {
      const text = e.detail?.text;
      if (text) {
        handleSend(t("contextMenu.deepSearchPrompt").replace("{name}", text));
      }
    };

    const handleChatButton = (e: CustomEvent<{ text?: string }>) => {
      const text = e.detail?.text;
      if (text) {
        handleSend(text);
      }
    };

    window.addEventListener(
      "triggerDeepSearch",
      handleDeepSearch as EventListener,
    );
    window.addEventListener(
      "triggerChatButton",
      handleChatButton as EventListener,
    );
    return () => {
      window.removeEventListener(
        "triggerDeepSearch",
        handleDeepSearch as EventListener,
      );
      window.removeEventListener(
        "triggerChatButton",
        handleChatButton as EventListener,
      );
    };
  }, [handleSend, t]);

  useEffect(() => {
    setMounted(true);

    // Artist deep-search triggered from the artists directory
    const pendingArtist = sessionStorage.getItem("pendingDeepSearch");
    if (pendingArtist) {
      sessionStorage.removeItem("pendingDeepSearch");
      handleSend(t("contextMenu.deepSearchPrompt").replace("{name}", pendingArtist));
    }

    // Product deep-search triggered from the products directory
    const pendingProductRaw = sessionStorage.getItem("pendingProductSearch");
    if (pendingProductRaw) {
      sessionStorage.removeItem("pendingProductSearch");
      try {
        const { id, name, sub_category, category } = JSON.parse(pendingProductRaw) as { id: string; name: string; sub_category?: string | null; category: string };
        const fullName = [sub_category, name].filter(Boolean).join(" ");
        handleSend(t("contextMenu.deepSearchPrompt").replace("{name}", fullName), undefined, undefined, true, id, category);
      } catch {
        // ignore malformed data
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch username from profiles table
  useEffect(() => {
    const fetchProfileUsername = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        if (!error && data?.username) {
          setProfileUsername(data.username);
        }
      }
    };

    fetchProfileUsername();
  }, [session?.user?.id]);

  // Auth redirect
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") return;
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      (session?.user as { status?: string })?.status === "unauthorized"
    ) {
      router.push("/registration-pending");
    }
  }, [status, session, router]);

  // Enforce default model for non-admin
  useEffect(() => {
    if (session && !isAdminUser(session)) {
      setSelectedModel(DEFAULT_NON_ADMIN_MODEL);
    }
  }, [session]);

  // Validate saved agent against subscription
  useEffect(() => {
    if (session) {
      const userStatus = (session.user as { status?: string })?.status;
      const available = getAvailableAgents(userStatus);
      if (!available.includes(selectedAgent)) {
        setSelectedAgent("flash");
        localStorage.setItem("selectedAgent", "flash");
      }
    }
  }, [session, selectedAgent]);

  // Fetch vignettes when category changes
  useEffect(() => {
    const category = searchParams.get("category");

    if (sessionStorage.getItem("pendingVignetteStream")) {
      return;
    }

    if (category && !conversationId) {
      if (!isLoading) {
        clearMessages();
      }

      window.scrollTo(0, 0);
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }

      const fetchVignettes = async () => {
        setVignetteLoading(true);
        setVignetteError(null);

        try {
          const url = `/api/vignettes?category=${category}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Failed to fetch vignettes: ${response.status}`);
          }

          const data = await response.json();
          setVignettes(data.vignettes || []);
          window.scrollTo(0, 0);
        } catch (error) {
          console.error("[Chat Page] Error fetching vignettes:", error);
          setVignetteError("Failed to load vignettes");
          setVignettes([]);
        } finally {
          setVignetteLoading(false);
        }
      };

      fetchVignettes();
    } else if (!conversationId && !isLoading) {
      clearMessages();
      setVignettes([]);
      setVignetteError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversationId, clearMessages, isLoading]);

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);

    if (conversationId) {
      try {
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: newModel }),
        });
      } catch (error) {
        console.error("Error updating conversation model:", error);
      }
    }
  };

  const handleAgentChange = (agent: AgentType) => {
    setSelectedAgent(agent);
    localStorage.setItem("selectedAgent", agent);
  };

  const handleVignetteClick = (vignette: VignetteData) => {
    const imageName = getImageNameFromUrl(vignette.public_url);

    const isMobileView = window.innerWidth < 768;
    if (isMobileView) {
      setSidebarOpen(false);
    }

    sessionStorage.setItem(
      "pendingVignetteView",
      JSON.stringify({
        imageName,
        category: vignette.category,
        tier: selectedAgent.toUpperCase(),
      }),
    );

    const slug = imageName.replace(/\.[^/.]+$/, "");
    router.push(`/chat?d=${slug}`);
  };

  const handleBackToCategory = (category: string) => {
    router.push(`/chat?category=${category}`);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
        <div className="text-center">
          <div className="w-64 h-32 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Image
              src={
                mounted && isDark
                  ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                  : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
              }
              alt="Prophetic Orchestra"
              width={256}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("chat.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!session && process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
    return null;
  }

  const vignetteSlug = searchParams.get("d");
  const isWelcomeScreen = !conversationId && !vignetteSlug;
  const userStatus = (session?.user as { status?: string })?.status as
    | "unauthorized"
    | "free"
    | "paid"
    | "admini"
    | "discover"
    | "intelligence"
    | "oracle"
    | undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <ChatHeader
        isWelcomeScreen={isWelcomeScreen}
        isAdmin={isAdminUser(session)}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        isLoading={isLoading}
        conversationId={conversationId}
      />

      {vignetteSlug && !conversationId ? (
        <VignetteDetailView
          key={vignetteSlug}
          vignetteSlug={vignetteSlug}
          selectedAgent={selectedAgent}
          onAgentChange={handleAgentChange}
          selectedModel={selectedModel}
          userStatus={userStatus}
        />
      ) : isWelcomeScreen ? (
        <WelcomeScreen
          messages={messages}
          streamingMessage={streamingMessage}
          streamingVignetteCategory={streamingVignetteCategory}
          vignettes={vignettes}
          vignetteLoading={vignetteLoading}
          vignetteError={vignetteError}
          input={input}
          setInput={setInput}
          handleSend={() => handleSend()}
          isLoading={isLoading}
          handleFlashcardClick={handleFlashcardClick}
          handleVignetteClick={handleVignetteClick}
          handleBackToCategory={handleBackToCategory}
          userName={profileUsername || session?.user?.name?.split(" ")[0] || ""}
          profileUsername={profileUsername}
          userStatus={userStatus}
          selectedAgent={selectedAgent}
          onAgentChange={handleAgentChange}
          mounted={mounted}
          isDark={isDark}
        />
      ) : (
        <ConversationView
          messages={messages}
          isLoading={isLoading}
          streamingMessage={streamingMessage}
          streamingMarketplaceData={streamingMarketplaceData}
          streamingRealEstateData={streamingRealEstateData}
          streamingVignetteData={streamingVignetteData}
          streamingClothesSearchData={streamingClothesSearchData}
          streamingVignetteCategory={streamingVignetteCategory}
          currentStatus={currentStatus}
          showStreamingIndicator={showStreamingIndicator}
          messagesEndRef={messagesEndRef}
          messagesContainerRef={messagesContainerRef}
          handleScroll={handleScroll}
          handleVignetteClick={handleVignetteClick}
          handleBackToCategory={handleBackToCategory}
          handleFlashcardClick={handleFlashcardClick}
          input={input}
          setInput={setInput}
          handleSend={() => handleSend()}
          userName={session?.user?.name?.[0]?.toUpperCase() || "U"}
          userStatus={userStatus}
          selectedAgent={selectedAgent}
          onAgentChange={handleAgentChange}
        />
      )}
    </div>
  );
}

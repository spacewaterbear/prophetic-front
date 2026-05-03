"use client";

import { lazy, Suspense, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/contexts/i18n-context";
import { LOGO_DARK, LOGO_LIGHT } from "@/lib/constants/logos";
import { ChatInput } from "@/components/chat-input";
import { MessageItem } from "./MessageItem";
import { AIAvatar } from "./AIAvatar";
import { Message } from "@/types/chat";
import { getCategoryDisplayNames } from "@/lib/translations";
import { VignetteData } from "@/types/vignettes";
import { useChatInputContext } from "@/contexts/chat-input-context";

const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);
const VignetteGridCard = lazy(() =>
  import("@/components/VignetteGridCard").then((mod) => ({
    default: mod.VignetteGridCard,
  })),
);

interface WelcomeScreenProps {
  messages: Message[];
  streamingMessage: string;
  streamingVignetteCategory: string | null;
  vignettes: VignetteData[];
  vignetteLoading: boolean;
  vignetteError: string | null;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  handleVignetteClick: (vignette: VignetteData) => void;
  handleBackToCategory: (category: string) => void;
  userName: string;
  profileUsername: string | null;
  mounted: boolean;
  isDark: boolean;
  isGuest?: boolean;
}

export function WelcomeScreen({
  messages,
  streamingMessage,
  streamingVignetteCategory,
  vignettes,
  vignetteLoading,
  vignetteError,
  input,
  setInput,
  handleSend,
  isLoading,
  handleVignetteClick,
  handleBackToCategory,
  userName,
  profileUsername,
  mounted,
  isDark,
  isGuest,
}: WelcomeScreenProps) {
  const welcomeContainerRef = useRef<HTMLDivElement>(null);
  const { t, language } = useI18n();
  const { selectedAgent, onAgentChange, userStatus, creditsExhausted, handleFlashcardClick } = useChatInputContext();
  const categoryNames = getCategoryDisplayNames(language);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");

  const categoryNavTabs: Record<string, { label: string; onClick: (() => void) | undefined }[]> = {
    WINE: [
      { label: t("categoryNav.WINE_0"), onClick: undefined },
      { label: t("categoryNav.WINE_1"), onClick: undefined },
      { label: t("categoryNav.WINE_2"), onClick: () => router.push("/chat/products?category=WINE&label=Domaines+viticoles") },
    ],
    SACS: [
      { label: t("categoryNav.SACS_0"), onClick: undefined },
      { label: t("categoryNav.SACS_1"), onClick: undefined },
      { label: t("categoryNav.SACS_2"), onClick: () => router.push("/chat/products?category=SACS&label=Pieces+de+luxe") },
    ],
    IMMO_LUXE: [
      { label: t("categoryNav.IMMO_LUXE_0"), onClick: undefined },
      { label: t("categoryNav.IMMO_LUXE_1"), onClick: undefined },
      { label: t("categoryNav.IMMO_LUXE_2"), onClick: () => router.push("/chat/products?category=IMMO_LUXE&label=Adresses+d%27exception") },
    ],
    MONTRES_LUXE: [
      { label: t("categoryNav.MONTRES_LUXE_0"), onClick: undefined },
      { label: t("categoryNav.MONTRES_LUXE_1"), onClick: undefined },
      { label: t("categoryNav.MONTRES_LUXE_2"), onClick: () => router.push("/chat/products?category=MONTRES_LUXE&label=Maisons+horlogeres") },
    ],
    CARS: [
      { label: t("categoryNav.CARS_0"), onClick: undefined },
      { label: t("categoryNav.CARS_1"), onClick: undefined },
      { label: t("categoryNav.CARS_2"), onClick: () => router.push("/chat/products?category=CARS&label=Ecuries+l%C3%A9gendaires") },
    ],
    SNEAKERS: [
      { label: t("categoryNav.SNEAKERS_0"), onClick: undefined },
      { label: t("categoryNav.SNEAKERS_1"), onClick: undefined },
      { label: t("categoryNav.SNEAKERS_2"), onClick: () => router.push("/chat/products?category=SNEAKERS&label=Mod%C3%A8les+iconiques") },
    ],
    WHISKY: [
      { label: t("categoryNav.WHISKY_0"), onClick: undefined },
      { label: t("categoryNav.WHISKY_1"), onClick: undefined },
      { label: t("categoryNav.WHISKY_2"), onClick: () => router.push("/chat/products?category=WHISKY&label=Distilleries+prestigieuses") },
    ],
    BIJOUX: [
      { label: t("categoryNav.BIJOUX_0"), onClick: undefined },
      { label: t("categoryNav.BIJOUX_1"), onClick: undefined },
      { label: t("categoryNav.BIJOUX_2"), onClick: () => router.push("/chat/products?category=BIJOUX&label=Maison+Joaillieres") },
    ],
    CARDS_US: [
      { label: t("categoryNav.CARDS_US_0"), onClick: undefined },
      { label: t("categoryNav.CARDS_US_1"), onClick: undefined },
      { label: t("categoryNav.CARDS_US_2"), onClick: () => router.push("/chat/products?category=CARDS_US&label=Univers+Collectibles") },
    ],
    ART_CONTEMPORAIN: [
      { label: t("categoryNav.ART_CONTEMPORAIN_0"), onClick: undefined },
      { label: t("categoryNav.ART_CONTEMPORAIN_1"), onClick: undefined },
      { label: t("categoryNav.ART_CONTEMPORAIN_2"), onClick: () => router.push("/chat/artists") },
    ],
    REVELATIONS: [
      { label: t("categoryNav.ART_CONTEMPORAIN_0"), onClick: undefined },
      { label: t("categoryNav.ART_CONTEMPORAIN_1"), onClick: undefined },
      { label: t("categoryNav.ART_CONTEMPORAIN_2"), onClick: () => router.push("/chat/artists") },
    ],
  };

  const IS_ART_SPECIALITY = process.env.NEXT_PUBLIC_SPECIALITY === "art";
  const artFallbackTabs = IS_ART_SPECIALITY
    ? [
        { label: t("categoryNav.ART_CONTEMPORAIN_0"), onClick: undefined },
        { label: t("categoryNav.ART_CONTEMPORAIN_1"), onClick: undefined },
        { label: t("categoryNav.ART_CONTEMPORAIN_2"), onClick: () => router.push("/chat/artists") },
      ]
    : undefined;

  const navTabs = currentCategory
    ? (categoryNavTabs[currentCategory] ?? artFallbackTabs)
    : undefined;

  const isWelcomeState =
    vignettes.length === 0 &&
    messages.length === 0 &&
    !streamingMessage &&
    !vignetteLoading &&
    !vignetteError;

  return (
    <div
      ref={welcomeContainerRef}
      className={`relative flex-1 bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] px-6 flex flex-col ${isWelcomeState ? "overflow-hidden" : "overflow-y-auto"}`}
    >
      <div
        className={`w-full max-w-4xl flex flex-col items-center py-10 mx-auto flex-1 ${isWelcomeState ? "justify-center" : ""}`}
      >
        {messages.length > 0 || streamingMessage ? (
          <div className="w-full max-w-5xl space-y-6">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userName={userName}
                onVignetteClick={handleVignetteClick}
                handleBackToCategory={handleBackToCategory}
              />
            ))}
            {streamingMessage && (
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                  <Suspense
                    fallback={
                      <div className="text-base text-gray-400">{t("chat.loading")}</div>
                    }
                  >
                    <Markdown
                      content={streamingMessage}
                      className="text-base"
                      categoryName={
                        streamingVignetteCategory
                          ? categoryNames[streamingVignetteCategory]
                          : undefined
                      }
                      onCategoryClick={
                        streamingVignetteCategory
                          ? () =>
                              handleBackToCategory(streamingVignetteCategory)
                          : undefined
                      }
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        ) : vignettes.length > 0 ? (
          <div className="w-full relative">
            {navTabs && (
              <div className="sticky top-0 z-10 flex items-center justify-center gap-6 py-3 mb-6 bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)]">
                {navTabs.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={tab.onClick}
                    className={`text-sm font-medium transition-colors ${
                      tab.onClick
                        ? "text-[#352ee8] hover:text-[#2520c0]"
                        : "text-gray-400 dark:text-gray-500 cursor-default"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <Suspense
              fallback={
                <div className="text-base text-gray-400">
                  {t("chat.loadingVignettes")}
                </div>
              }
            >
              <VignetteGridCard
                data={vignettes}
                onVignetteClick={handleVignetteClick}
                forceArtLayout={currentCategory === "ART_CONTEMPORAIN" || currentCategory === "REVELATIONS"}
              />
            </Suspense>
          </div>
        ) : vignetteLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading vignettes...
            </p>
          </div>
        ) : vignetteError ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-600 dark:text-red-400">{vignetteError}</p>
          </div>
        ) : (
          <>
            {/* Hero Text */}
            <div className="mb-8 w-full max-w-3xl">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                {t("chat.heroTitle")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {t("chat.heroSubtitle")}
              </p>
            </div>

            {/* Logo + Greeting */}
            {(profileUsername || userName) && <div className="flex items-center gap-4 mb-0 pb-[30px] w-full max-w-3xl">
              <div className="w-[42px] h-[42px] flex items-center justify-center flex-shrink-0">
                <Image
                  src={
                    mounted && isDark
                      ? LOGO_DARK
                      : LOGO_LIGHT
                  }
                  alt="Prophetic Orchestra"
                  width={150}
                  height={150}
                  unoptimized
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-base sm:text-xl font-medium text-gray-900 dark:text-white">
                {t("chat.greeting").replace(
                  "{name}",
                  profileUsername || userName || "",
                )}
              </h1>
            </div>}

            {/* Chat Input */}
            <ChatInput
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              isLoading={isLoading}
              className="max-w-3xl"
            />
          </>
        )}
      </div>
      <div className="w-full pb-2 flex justify-center items-center gap-3 flex-wrap">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
          {t("chat.disclaimer")}
        </p>
        <div className="flex items-center gap-2">
          <Link href="/cgu" target="_blank" className="text-[10px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 underline transition-colors">
            CGU
          </Link>
          <span className="text-[10px] text-gray-400 dark:text-gray-600">·</span>
          <Link href="/cgv" target="_blank" className="text-[10px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 underline transition-colors">
            CGV
          </Link>
          <span className="text-[10px] text-gray-400 dark:text-gray-600">·</span>
          <Link href="/confidentiality-policy" target="_blank" className="text-[10px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 underline transition-colors">
            {t("login.privacyLabel")}
          </Link>
        </div>
      </div>
    </div>
  );
}

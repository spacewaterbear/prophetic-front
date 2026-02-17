"use client";

import { Plus, Send, Paperclip, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";
import { createPortal } from "react-dom";
import {
  FileUploadPreview,
  AttachedFile,
} from "@/components/FileUploadPreview";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FLASHCARD_MAPPING } from "@/lib/constants/flashcards";
import { getAvailableAgents, AgentType, UserStatus } from "@/types/agents";
import { ModeSelector } from "./ModeSelector";
import { FlashcardMenu } from "./FlashcardMenu";
import { PortfolioMenu } from "./PortfolioMenu";
import { SettingsMenu } from "./SettingsMenu";
import { MobileBottomSheets } from "./MobileBottomSheets";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  userStatus?: UserStatus;
  selectedAgent?: AgentType;
  onAgentChange?: (agent: AgentType) => void;
  userId?: string;
  conversationId?: number | null;
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFlashcardClick?: (
    flashCards: string,
    question: string,
    flashCardType: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO",
    displayName: string,
    tier?: string,
  ) => void;
}

export function ChatInput({
  input,
  setInput,
  handleSend,
  isLoading,
  className = "",
  textareaRef,
  userStatus = "discover",
  selectedAgent = "discover",
  onAgentChange,
  userId,
  conversationId,
  attachedFiles = [],
  onFilesChange,
  onFlashcardClick,
}: ChatInputProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || internalRef;
  const [textareaHeight, setTextareaHeight] = useState<number>(24);

  // Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isChronoOpen, setIsChronoOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mobileMenuLevel, setMobileMenuLevel] = useState<
    "main" | "flashcards" | "ranking" | "portfolio"
  >("main");

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleRetryUpload,
  } = useFileUpload({ userId, conversationId, attachedFiles, onFilesChange });

  const availableAgents = getAvailableAgents(userStatus);

  const closeAllDropdowns = () => {
    setIsDropdownOpen(false);
    setIsFileUploadOpen(false);
    setIsChronoOpen(false);
    setIsRankingOpen(false);
    setIsSettingsOpen(false);
    setIsPortfolioOpen(false);
  };

  const handleAgentClick = (agent: AgentType) => {
    if (availableAgents.includes(agent) && onAgentChange) {
      onAgentChange(agent);
    }
  };

  const handleFlashcardSelect = (
    category: string,
    flashCardType: "flash_invest" | "ranking" = "flash_invest",
  ) => {
    const mapping = FLASHCARD_MAPPING[category];
    if (mapping && onFlashcardClick) {
      setSelectedCategory(category);
      onFlashcardClick(
        mapping.flash_cards,
        mapping.question,
        flashCardType,
        category,
        selectedAgent,
      );
      setIsChronoOpen(false);
      setIsRankingOpen(false);
    }
  };

  const handlePortfolioClick = (tierName: string, subCategory: string) => {
    if (onFlashcardClick) {
      onFlashcardClick(
        subCategory,
        `Show portfolio strategy for ${tierName}`,
        "PORTFOLIO",
        tierName,
        selectedAgent,
      );
      setIsPortfolioOpen(false);
    }
  };

  // Hover helpers for desktop dropdowns
  const makeHoverHandlers = (openFn: () => void, closeFn: () => void) => ({
    onMouseEnter: () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (window.matchMedia("(hover: hover)").matches) {
        closeAllDropdowns();
        openFn();
      }
    },
    onMouseLeave: () => {
      if (window.matchMedia("(hover: hover)").matches) {
        closeTimeoutRef.current = setTimeout(closeFn, 100);
      }
    },
  });

  const modeSelectorHover = makeHoverHandlers(
    () => setIsDropdownOpen(true),
    () => setIsDropdownOpen(false),
  );
  const chronoHover = makeHoverHandlers(
    () => setIsChronoOpen(true),
    () => setIsChronoOpen(false),
  );
  const rankingHover = makeHoverHandlers(
    () => setIsRankingOpen(true),
    () => setIsRankingOpen(false),
  );
  const portfolioHover = makeHoverHandlers(
    () => setIsPortfolioOpen(true),
    () => setIsPortfolioOpen(false),
  );
  const settingsHover = makeHoverHandlers(
    () => setIsSettingsOpen(true),
    () => setIsSettingsOpen(false),
  );
  const fileUploadHover = makeHoverHandlers(
    () => setIsFileUploadOpen(true),
    () => setIsFileUploadOpen(false),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    const LINE_HEIGHT = 24;
    const MAX_ROWS = 7;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const maxPixelHeight = LINE_HEIGHT * MAX_ROWS;
    const newHeight = Math.min(
      Math.max(scrollHeight, LINE_HEIGHT),
      maxPixelHeight,
    );
    setTextareaHeight(newHeight);
    textarea.style.height = `${newHeight}px`;
  }, [input, ref]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`relative flex flex-col w-full max-w-3xl mx-auto bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-[24px] p-4 shadow-sm transition-colors ${className}`}
      onClick={() => ref.current?.focus()}
    >
      {/* Info icon */}
      <div className="absolute top-2 right-3 z-10 group">
        <div className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer transition-colors">
          <Info className="w-4 h-4" />
        </div>
        <div className="absolute right-0 top-full mt-2 w-[320px] bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-2xl p-4 shadow-2xl border dark:border-transparent opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 ease-out">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Exemples de questions
          </p>
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Stratégie
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Portfolio diversifié [Budget X] avec ROI&quot;
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Top 5 actifs pour [Budget X]&quot;
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Stratégie de réinvestissement des gains&quot;
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Analyse
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Investir sur [Artiste/Marque] : Oui/Non ?&quot;
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Potentiel de revente de [Nom de l&apos;actif]&quot;
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Scoring de rareté vs demande actuelle&quot;
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Comparaison
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Luxe vs Locatif (Ville A/Ville B)&quot;
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Comparatif [Actif A] vs [Actif B]&quot;
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                &quot;Performance Art vs S&amp;P 500&quot;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileSelect}
      />

      {/* File Upload Preview */}
      <FileUploadPreview
        files={attachedFiles}
        onRemove={handleRemoveFile}
        onRetry={handleRetryUpload}
      />

      {/* Textarea */}
      <div className="w-full mb-2">
        <textarea
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-gray-500 text-gray-900 dark:text-white text-base leading-6 overflow-y-auto max-h-[168px] discret-scrollbar"
          style={{ minHeight: "24px" }}
          rows={1}
        />
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center w-full">
        {/* Leading Actions */}
        <div className="flex items-center gap-0.5">
          {/* File Upload Button */}
          <div className="relative flex-shrink-0">
            <button
              className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full p-2.5 transition-colors"
              aria-label="Add file"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFileUploadOpen(!isFileUploadOpen);
                setIsDropdownOpen(false);
              }}
              onMouseEnter={fileUploadHover.onMouseEnter}
              onMouseLeave={fileUploadHover.onMouseLeave}
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Desktop File Upload Dropdown */}
            <div
              className={`
                hidden sm:block
                absolute left-0 bottom-full mb-2
                transition-all duration-300 ease-out z-10
                ${isFileUploadOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
              `}
              onMouseEnter={fileUploadHover.onMouseEnter}
              onMouseLeave={fileUploadHover.onMouseLeave}
            >
              <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[320px] shadow-2xl border dark:border-transparent">
                <button
                  className="w-full flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl opacity-50 cursor-not-allowed group transition-all duration-200"
                  disabled
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-xl">
                      <Paperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Upload file
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Share documents or images
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md">
                    {t("chat.comingSoon")}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <ModeSelector
            selectedAgent={selectedAgent}
            availableAgents={availableAgents}
            isOpen={isDropdownOpen}
            onToggle={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setIsFileUploadOpen(false);
            }}
            onAgentClick={handleAgentClick}
            onMouseEnter={modeSelectorHover.onMouseEnter}
            onMouseLeave={modeSelectorHover.onMouseLeave}
            mounted={mounted}
          />

          {/* Flashcard Menu */}
          <FlashcardMenu
            type="flashcard"
            isOpen={isChronoOpen}
            onToggle={() => {
              setIsChronoOpen(!isChronoOpen);
              setIsDropdownOpen(false);
              setIsFileUploadOpen(false);
            }}
            onMouseEnter={chronoHover.onMouseEnter}
            onMouseLeave={chronoHover.onMouseLeave}
            selectedCategory={selectedCategory}
            onCategorySelect={handleFlashcardSelect}
            mounted={mounted}
            isDark={isDark}
          />

          {/* Ranking Menu */}
          <FlashcardMenu
            type="ranking"
            isOpen={isRankingOpen}
            onToggle={() => {
              setIsRankingOpen(!isRankingOpen);
              setIsDropdownOpen(false);
              setIsFileUploadOpen(false);
              setIsChronoOpen(false);
              setIsSettingsOpen(false);
            }}
            onMouseEnter={rankingHover.onMouseEnter}
            onMouseLeave={rankingHover.onMouseLeave}
            selectedCategory={selectedCategory}
            onCategorySelect={handleFlashcardSelect}
            mounted={mounted}
            isDark={isDark}
          />

          {/* Portfolio Menu */}
          <PortfolioMenu
            selectedAgent={selectedAgent}
            isOpen={isPortfolioOpen}
            onToggle={() => {
              setIsPortfolioOpen(!isPortfolioOpen);
              setIsDropdownOpen(false);
              setIsFileUploadOpen(false);
              setIsChronoOpen(false);
              setIsRankingOpen(false);
              setIsSettingsOpen(false);
            }}
            onMouseEnter={portfolioHover.onMouseEnter}
            onMouseLeave={portfolioHover.onMouseLeave}
            onPortfolioClick={handlePortfolioClick}
            mounted={mounted}
            isDark={isDark}
          />

          {/* Settings Menu */}
          <SettingsMenu
            isOpen={isSettingsOpen}
            onToggle={() => {
              setIsSettingsOpen(!isSettingsOpen);
              setIsDropdownOpen(false);
              setIsFileUploadOpen(false);
              setIsChronoOpen(false);
              setIsRankingOpen(false);
            }}
            onMouseEnter={settingsHover.onMouseEnter}
            onMouseLeave={settingsHover.onMouseLeave}
            mounted={mounted}
            isDark={isDark}
          />
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-2">
          {input.trim() ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
              disabled={isLoading}
              className="flex items-center justify-center p-2.5 rounded-full text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Send className="h-5 w-5 transform rotate-45 ml-0.5" />
            </button>
          ) : (
            <div className="w-10 h-10"></div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheets - Rendered via Portal */}
      {mounted &&
        createPortal(
          <MobileBottomSheets
            isDropdownOpen={isDropdownOpen}
            onCloseDropdown={() => setIsDropdownOpen(false)}
            selectedAgent={selectedAgent}
            availableAgents={availableAgents}
            onAgentClick={handleAgentClick}
            isFileUploadOpen={isFileUploadOpen}
            onCloseFileUpload={() => setIsFileUploadOpen(false)}
            mobileMenuLevel={mobileMenuLevel}
            onMobileMenuLevelChange={setMobileMenuLevel}
            selectedCategory={selectedCategory}
            onFlashcardClick={handleFlashcardSelect}
            onPortfolioClick={handlePortfolioClick}
            isChronoOpen={isChronoOpen}
            onCloseChono={() => setIsChronoOpen(false)}
            isSettingsOpen={isSettingsOpen}
            onCloseSettings={() => setIsSettingsOpen(false)}
            isRankingOpen={isRankingOpen}
            onCloseRanking={() => setIsRankingOpen(false)}
            mounted={mounted}
            isDark={isDark}
          />,
          document.body,
        )}
    </div>
  );
}

"use client";

import { Plus, ArrowUp, Paperclip, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";
import { useDarkMode } from "@/hooks/useDarkMode";
import { createPortal } from "react-dom";
import {
  FileUploadPreview,
  AttachedFile,
} from "@/components/FileUploadPreview";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FLASHCARD_MAPPING } from "@/lib/constants/flashcards";
import { getAvailableAgents, type AgentType } from "@/types/agents";
import { useChatInputContext } from "@/contexts/chat-input-context";
import { ModeSelector } from "./ModeSelector";
import { SettingsMenu } from "./SettingsMenu";
import { MobileBottomSheets } from "./MobileBottomSheets";

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
}

const isArtSpeciality = process.env.NEXT_PUBLIC_SPECIALITY === "art";

export function ChatInput({
  input,
  setInput,
  handleSend,
  isLoading,
  className = "",
  textareaRef,
  attachedFiles: propsAttachedFiles,
  onFilesChange: propsOnFilesChange,
}: ChatInputProps) {
  const {
    userStatus = "discover",
    selectedAgent = "discover",
    onAgentChange,
    userId,
    conversationId,
    creditsExhausted = false,
    handleFlashcardClick: onFlashcardClick,
  } = useChatInputContext();

  const attachedFiles = propsAttachedFiles ?? [];
  const onFilesChange = propsOnFilesChange;
  const isDark = useDarkMode();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || internalRef;
  const [textareaHeight, setTextareaHeight] = useState<number>(24);

  // Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    setIsSettingsOpen(false);
  };

  const handleAgentClick = (agent: AgentType) => {
    if (onAgentChange) {
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
      setIsDropdownOpen(false);
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
      setIsDropdownOpen(false);
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

    const LINE_HEIGHT = 40;
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

  if (creditsExhausted) {
    return (
      <div
        className={`relative flex flex-col w-full max-w-3xl mx-auto bg-white dark:bg-[#1e1f20] rounded-[24px] p-4 shadow-[0_2px_6px_2px_rgba(0,0,0,0.10),0_1px_2px_0px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_6px_2px_rgba(0,0,0,0.30),0_1px_2px_0px_rgba(0,0,0,0.25)] transition-colors ${className}`}
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("credits.exhaustedTitle")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t("credits.exhaustedMessage")}
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full bg-[#372ee9] hover:bg-[#2a22c7] text-white transition-colors"
          >
            {t("credits.choosePlan")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col w-full max-w-3xl mx-auto bg-white dark:bg-[#1e1f20] rounded-[24px] p-4 shadow-[0_2px_6px_2px_rgba(0,0,0,0.10),0_1px_2px_0px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_6px_2px_rgba(0,0,0,0.30),0_1px_2px_0px_rgba(0,0,0,0.25)] transition-colors ${className}`}
      onClick={() => ref.current?.focus()}
    >
      {/* Info icon */}
      <div className="absolute top-2 right-3 z-10 group">
        <div className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer transition-colors">
          <Info className="w-4 h-4" />
        </div>
        <div className="absolute right-0 bottom-full mb-2 w-[320px] bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-2xl p-4 shadow-2xl border dark:border-transparent opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 ease-out">
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
      <div className="w-full mb-2 pr-8">
        <textarea
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-gray-400 text-gray-900 dark:text-white text-[11px] sm:text-base leading-7 overflow-y-auto max-h-[196px] discret-scrollbar"
          style={{ minHeight: "28px" }}
          rows={1}
        />
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center w-full">
        {/* Leading Actions */}
        <div className="flex items-center gap-2">
          {/* File Upload Button */}
          <div className="relative flex-shrink-0">
            <button
              className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full p-2 transition-colors"
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
              <div className="bg-white dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[320px] shadow-2xl border dark:border-transparent">
                <button
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1e1f20] rounded-2xl opacity-50 cursor-not-allowed group transition-all duration-200"
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

          {/* Settings Menu (Orchestration) */}
          <SettingsMenu
            isOpen={isSettingsOpen}
            onToggle={() => {
              setIsSettingsOpen(!isSettingsOpen);
              setIsDropdownOpen(false);
              setIsFileUploadOpen(false);
            }}
            onMouseEnter={settingsHover.onMouseEnter}
            onMouseLeave={settingsHover.onMouseLeave}
            mounted={mounted}
            isDark={isDark}
          />
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Selector (Flash) */}
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

          {/* Send Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSend();
            }}
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#352ee8] hover:bg-[#2920c7] disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white transition-colors flex-shrink-0"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
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
            isSettingsOpen={isSettingsOpen}
            onCloseSettings={() => setIsSettingsOpen(false)}
            mounted={mounted}
            isDark={isDark}
          />,
          document.body,
        )}
    </div>
  );
}

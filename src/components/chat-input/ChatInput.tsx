"use client";

import { Plus, ArrowUp, Paperclip, Info, ChevronDown, Check } from "lucide-react";
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
import type { ImmoVariant } from "@/types/chat";
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
const isMainSpeciality = process.env.NEXT_PUBLIC_SPECIALITY === "main";

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
    immoVariant,
    onImmoVariantChange,
    isTester,
  } = useChatInputContext();

  const attachedFiles = propsAttachedFiles ?? [];
  const onFilesChange = propsOnFilesChange;
  const isDark = useDarkMode();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || internalRef;
  const [textareaHeight, setTextareaHeight] = useState<number>(24);

  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImmoVariantOpen, setIsImmoVariantOpen] = useState(false);
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
    setIsImmoVariantOpen(false);
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
  const immoVariantHover = makeHoverHandlers(
    () => setIsImmoVariantOpen(true),
    () => setIsImmoVariantOpen(false),
  );

  const IMMO_VARIANTS: ImmoVariant[] = ["notaire", "cgp_immo", "agence"];

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
      <div className="absolute top-2 right-3 z-10">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer transition-colors"
          onClick={(e) => { e.stopPropagation(); setHelpModalOpen(true); }}
        >
          <Info className="w-4 h-4" />
        </div>
      </div>

      {/* Help modal */}
      {helpModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setHelpModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[600px] bg-white dark:bg-[#1e1f20] rounded-[24px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header with floating search bar */}
            <div className="shrink-0 h-[70px] sm:h-[120px] overflow-hidden bg-black">
              <img
                src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/start/help.png"
                alt=""
                className="w-full h-full object-cover object-top scale-[1.03]"
              />
            </div>

            {/* Content */}
            <div className="px-5 sm:px-10 pt-6 sm:pt-8 pb-4 sm:pb-6 text-gray-900 dark:text-white overflow-y-auto">
              <h2 className="text-[1.2rem] sm:text-[1.4rem] font-bold mb-4 sm:mb-6 tracking-tight">{t("helpModal.title")}</h2>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <p className="text-[0.75rem] sm:text-[0.85rem] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">
                    {t("helpModal.strategyLabel")}
                  </p>
                  <div className="text-[0.9rem] sm:text-[1rem] text-gray-500 dark:text-gray-400 italic leading-relaxed">
                    <p>{t("helpModal.strategyEx1")}</p>
                    <p>{t("helpModal.strategyEx2")}</p>
                    <p>{t("helpModal.strategyEx3")}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[0.75rem] sm:text-[0.85rem] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">
                    {t("helpModal.analysisLabel")}
                  </p>
                  <div className="text-[0.9rem] sm:text-[1rem] text-gray-500 dark:text-gray-400 italic leading-relaxed">
                    <p>{t("helpModal.analysisEx1")}</p>
                    <p>{t("helpModal.analysisEx2")}</p>
                    <p>{t("helpModal.analysisEx3")}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[0.75rem] sm:text-[0.85rem] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">
                    {t("helpModal.comparisonLabel")}
                  </p>
                  <div className="text-[0.9rem] sm:text-[1rem] text-gray-500 dark:text-gray-400 italic leading-relaxed">
                    <p>{t("helpModal.comparisonEx1")}</p>
                    <p>{t("helpModal.comparisonEx2")}</p>
                    <p>{t("helpModal.comparisonEx3")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-5 sm:px-10 py-4 sm:py-6 shrink-0">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="bg-black dark:bg-white text-white dark:text-black px-8 sm:px-12 py-3 sm:py-3.5 rounded-2xl font-bold text-base sm:text-lg hover:opacity-80 transition-opacity"
              >
                {t("helpModal.close")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
          {/* ImmoVariant Selector */}
          {isMainSpeciality && isTester && <div className="static sm:relative flex-shrink-0">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsImmoVariantOpen(!isImmoVariantOpen);
                setIsDropdownOpen(false);
                setIsSettingsOpen(false);
                setIsFileUploadOpen(false);
              }}
              onMouseEnter={immoVariantHover.onMouseEnter}
              onMouseLeave={immoVariantHover.onMouseLeave}
            >
              <span className="text-gray-900 dark:text-white font-medium text-sm truncate whitespace-nowrap">
                {immoVariant ? t(`immoVariant.${immoVariant}`) : t("immoVariant.label")}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-900 dark:text-white" aria-hidden="true" />
            </button>

            {/* Desktop ImmoVariant Dropdown */}
            <div
              className={`
                hidden sm:block
                absolute right-0 bottom-full mb-2
                transition-all duration-300 ease-out
                z-10
                ${isImmoVariantOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
              `}
              onMouseEnter={immoVariantHover.onMouseEnter}
              onMouseLeave={immoVariantHover.onMouseLeave}
            >
              <div className="bg-white dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-3 w-[200px] shadow-2xl border dark:border-transparent">
                <button
                  type="button"
                  onClick={() => { onImmoVariantChange(null); setIsImmoVariantOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors ${
                    immoVariant === null
                      ? "bg-gray-100 dark:bg-[#1e1f20] font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-[#1e1f20]"
                  }`}
                >
                  <span>{t("immoVariant.label")}</span>
                  {immoVariant === null && <Check className="h-4 w-4 text-blue-500" />}
                </button>
                {IMMO_VARIANTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { onImmoVariantChange(v); setIsImmoVariantOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      immoVariant === v
                        ? "bg-gray-100 dark:bg-[#1e1f20] font-semibold"
                        : "hover:bg-gray-100 dark:hover:bg-[#1e1f20]"
                    }`}
                  >
                    <span>{t(`immoVariant.${v}`)}</span>
                    {immoVariant === v && <Check className="h-4 w-4 text-blue-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>}

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

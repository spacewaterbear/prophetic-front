"use client";

import React, { useEffect, useState } from "react";
import { marked } from "marked";
import {
  convertMarkdownTablesToStyledHtml,
  convertAsciiTablesToHtml,
  convertRankingListsToHtml,
  convertExtendedRankingsToHtml,
  convertAllocationProfilesToHtml,
  convertBarChartsToHtml,
  convertPerfBarsToHtml,
  convertComparisonBarsToHtml,
  convertScatterPlotsToHtml,
} from "@/lib/markdown-utils";

interface MarkdownProps {
  content: string;
  className?: string;
  categoryName?: string;
  onCategoryClick?: () => void;
  wordsToHighlight?: string[] | null;
  editable?: boolean;
  isEditing?: boolean;
  onSave?: (html: string) => void;
  onEditCancel?: () => void;
}

export function Markdown({ content, className, categoryName, onCategoryClick, wordsToHighlight, editable, isEditing: controlledIsEditing, onSave, onEditCancel }: MarkdownProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = controlledIsEditing !== undefined;
  const isEditing = isControlled ? controlledIsEditing : internalIsEditing;

  const injectHighlightMarkers = (text: string, words: string[]): string => {
    if (words.length === 0) return text;
    let result = text;
    for (const word of words) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), (match) => `-+-${match}-+-`);
    }
    return result;
  };

  // Helper to convert -+-word-+- markers to clickable elements
  const convertAnalysisMarkers = (text: string): string => {
    // Match -+-word-+- pattern and replace with HTML span
    return text.replace(/-\+-(.+?)-\+-/g, (match, word) => {
      return `<span data-analysis class="inline-block cursor-pointer border-l-4 border-orange-500 pl-3 pr-2 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 transition-colors font-medium">${word}</span>`;
    });
  };

  // Helper to convert ++text++ markers to clickable chat buttons in a 2-column grid
  const convertChatButtons = (html: string): string => {
    const buttonTag = (label: string) =>
      `<button data-chat-button class="chat-btn-grid-item">${label}</button>`;

    // Step 1: Replace individual ++text++ markers with button tags
    let result = html.replace(/\+\+(.+?)\+\+/g, (_, label) => buttonTag(label));

    // Step 2: Merge consecutive <p> blocks that contain only buttons into a single grid.
    // marked() wraps each line in its own <p>, so we need to collect them together.
    result = result.replace(
      /(?:<p>\s*(?:<button data-chat-button[^>]*>.*?<\/button>\s*)+<\/p>\s*)+/g,
      (match) => {
        const buttons: string[] = [];
        match.replace(/<button data-chat-button[^>]*>.*?<\/button>/g, (btn) => {
          buttons.push(btn);
          return '';
        });
        return buttons.length > 0
          ? `<div class="chat-btn-grid">${buttons.join('')}</div>`
          : match;
      }
    );

    return result;
  };

  useEffect(() => {
    async function processMarkdown() {
      try {
        // First, convert markdown to HTML using marked
        const processedContent =
          wordsToHighlight && wordsToHighlight.length > 0
            ? injectHighlightMarkers(content, wordsToHighlight)
            : content;
        let html = await marked(processedContent);

        // Apply conversion functions in the correct order
        // 1. Allocation profiles (must be before ASCII tables to avoid conflicts)
        html = convertAllocationProfilesToHtml(html);

        // 1b. Scatter plots (before bar charts to avoid conflicts with | character)
        html = convertScatterPlotsToHtml(html);

        // 2. Bar charts (before ASCII tables to avoid conflicts)
        html = convertBarChartsToHtml(html);

        // 2b. Performance comparison bars
        html = convertPerfBarsToHtml(html);

        // 2c. Comparison benchmark bars (=== pattern with est./vol. support)
        html = convertComparisonBarsToHtml(html);

        // 3. ASCII tables
        html = convertAsciiTablesToHtml(html);

        // 4. Extended rankings
        html = convertExtendedRankingsToHtml(html);

        // 4. Simple ranking lists
        html = convertRankingListsToHtml(html);

        // 5. Standard markdown tables (last, to style any remaining tables)
        html = convertMarkdownTablesToStyledHtml(html);

        // Finally, convert analysis markers after all other processing
        // This ensures they are correctly rendered even when inside code blocks or custom components
        html = convertAnalysisMarkers(html);

        // Convert ++text++ chat button markers
        html = convertChatButtons(html);

        setHtmlContent(html);
      } catch (error) {
        console.error("Error processing markdown:", error);
        setHtmlContent(content);
      }
    }

    processMarkdown();
  }, [content, wordsToHighlight]);

  // Helper to handle analysis markers (-+-)
  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Check if clicked element or its parent has the chat button marker
    const chatButtonElement = target.closest('[data-chat-button]');
    if (chatButtonElement) {
      const text = chatButtonElement.textContent?.trim();
      if (text) {
        const customEvent = new CustomEvent("triggerChatButton", {
          detail: { text }
        });
        window.dispatchEvent(customEvent);
      }
      return;
    }

    // Check if clicked element or its parent has the analysis marker
    const analysisElement = target.closest('[data-analysis]');
    if (analysisElement) {
      // Prioritize explicit query attribute, fallback to text content
      const queryPlaceholder = (analysisElement as HTMLElement).getAttribute('data-analysis-query');
      const text = queryPlaceholder || analysisElement.textContent?.replace(/-\+-/g, '').trim();

      if (text) {
        const customEvent = new CustomEvent("triggerDeepSearch", {
          detail: { text }
        });
        window.dispatchEvent(customEvent);
      }
    }
  };

  const enterEditMode = () => {
    if (isControlled) return; // parent controls edit mode via isEditing prop
    setInternalIsEditing(true);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (!editable || isEditing) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-chat-button]') || target.closest('[data-analysis]')) return;
    enterEditMode();
  };

  const handleSave = () => {
    if (containerRef.current && onSave) {
      onSave(containerRef.current.innerHTML);
    }
    if (!isControlled) {
      setInternalIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = htmlContent;
    }
    if (isControlled) {
      onEditCancel?.();
    } else {
      setInternalIsEditing(false);
    }
  };

  return (
    <div className="relative">
      {categoryName && onCategoryClick && (
        <div className="hidden flex justify-start mb-4">
          <button
            onClick={onCategoryClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            {categoryName}
          </button>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Save
          </button>
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancel
          </button>
        </div>
      )}

      {!isControlled && editable && !isEditing && (
        <div className="mb-2">
          <span className="text-xs text-zinc-500">Double-click to edit</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={`max-w-none px-0 markdown-container ${className || ''} ${isEditing ? 'edit-mode ring-2 ring-emerald-500/50 rounded-lg p-5 sm:p-6 bg-emerald-500/5' : ''}`}
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

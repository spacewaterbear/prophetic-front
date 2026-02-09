"use client";

import React, { useEffect, useState } from "react";
import { marked } from "marked";
import {
  convertMarkdownTablesToStyledHtml,
  convertAsciiTablesToHtml,
  convertRankingListsToHtml,
  convertExtendedRankingsToHtml,
  convertAllocationProfilesToHtml,
} from "@/lib/markdown-utils";

interface MarkdownProps {
  content: string;
  className?: string;
  categoryName?: string;
  onCategoryClick?: () => void;
}

export function Markdown({ content, className, categoryName, onCategoryClick }: MarkdownProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");

  // Helper to convert -+-word-+- markers to clickable elements
  const convertAnalysisMarkers = (text: string): string => {
    // Match -+-word-+- pattern and replace with HTML span
    return text.replace(/-\+-(.+?)-\+-/g, (match, word) => {
      return `<span data-analysis class="inline-block cursor-pointer border-l-4 border-orange-500 pl-3 pr-2 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 transition-colors font-medium">${word}</span>`;
    });
  };

  useEffect(() => {
    async function processMarkdown() {
      try {
        // First, convert analysis markers before markdown processing
        let processedContent = convertAnalysisMarkers(content);

        // Convert markdown to HTML using marked
        let html = await marked(processedContent);

        // Apply conversion functions in the correct order
        // 1. Allocation profiles (must be before ASCII tables to avoid conflicts)
        html = convertAllocationProfilesToHtml(html);

        // 2. ASCII tables
        html = convertAsciiTablesToHtml(html);

        // 3. Extended rankings
        html = convertExtendedRankingsToHtml(html);

        // 4. Simple ranking lists
        html = convertRankingListsToHtml(html);

        // 5. Standard markdown tables (last, to style any remaining tables)
        html = convertMarkdownTablesToStyledHtml(html);

        setHtmlContent(html);
      } catch (error) {
        console.error("Error processing markdown:", error);
        setHtmlContent(content);
      }
    }

    processMarkdown();
  }, [content]);

  // Helper to handle analysis markers (-+-)
  const handleAnalysisClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Check if clicked element or its parent has the analysis marker
    const analysisElement = target.closest('[data-analysis]');
    if (analysisElement) {
      const text = analysisElement.textContent?.replace(/-\+-/g, '').trim();
      if (text) {
        const customEvent = new CustomEvent("triggerDeepSearch", {
          detail: { text }
        });
        window.dispatchEvent(customEvent);
      }
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
      <div
        className={`max-w-none px-0 markdown-container ${className || ''}`}
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
        onClick={handleAnalysisClick}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

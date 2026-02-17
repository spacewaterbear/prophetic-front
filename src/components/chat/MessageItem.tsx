"use client";

import { lazy, memo, Suspense, useState } from "react";
import { Check, Copy, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AIAvatar } from "./AIAvatar";
import { Message, CATEGORY_DISPLAY_NAMES } from "@/types/chat";
import { VignetteData } from "@/types/vignettes";
import {
  convertMarkdownTablesToStyledHtml,
  convertAsciiTablesToHtml,
  convertRankingListsToHtml,
  convertExtendedRankingsToHtml,
  convertAllocationProfilesToHtml,
} from "@/lib/markdown-utils";

const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);
const ArtistCard = lazy(() =>
  import("@/components/ArtistCard").then((mod) => ({
    default: mod.ArtistCard,
  })),
);
const MarketplaceCard = lazy(() =>
  import("@/components/MarketplaceCard").then((mod) => ({
    default: mod.MarketplaceCard,
  })),
);
const RealEstateCard = lazy(() =>
  import("@/components/RealEstateCard").then((mod) => ({
    default: mod.RealEstateCard,
  })),
);
const VignetteGridCard = lazy(() =>
  import("@/components/VignetteGridCard").then((mod) => ({
    default: mod.VignetteGridCard,
  })),
);
const ClothesSearchCard = lazy(() =>
  import("@/components/ClothesSearchCard").then((mod) => ({
    default: mod.ClothesSearchCard,
  })),
);

interface MessageItemProps {
  message: Message;
  userName: string;
  onVignetteClick?: (vignette: VignetteData) => void;
  handleBackToCategory?: (category: string) => void;
}

export const MessageItem = memo(
  ({
    message,
    userName,
    onVignetteClick,
    handleBackToCategory,
  }: MessageItemProps) => {
    const [copied, setCopied] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
        toast.error("Failed to copy to clipboard");
      }
    };

    const handleExportPdf = async () => {
      if (!message.content) return;
      setPdfLoading(true);
      try {
        const html2pdf = (await import("html2pdf.js")).default;
        const { marked } = await import("marked");

        let html = await marked(message.content);
        html = convertAllocationProfilesToHtml(html);
        html = convertAsciiTablesToHtml(html);
        html = convertExtendedRankingsToHtml(html);
        html = convertRankingListsToHtml(html);
        html = convertMarkdownTablesToStyledHtml(html);

        const classToStyle: Record<string, string> = {
          "ranking-list":
            "display:flex;flex-direction:column;gap:12px;margin:16px 0;",
          "ranking-card":
            "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;margin-bottom:8px;",
          "ranking-header":
            "display:flex;align-items:center;gap:12px;margin-bottom:12px;",
          "ranking-number":
            "font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:600;color:#352ee8;min-width:32px;",
          "ranking-name":
            "font-family:'EB Garamond',Georgia,serif;font-size:16px;font-weight:500;color:#18181b;",
          "ranking-progress-bar":
            "width:100%;height:6px;background:rgba(0,0,0,0.05);border-radius:3px;overflow:hidden;margin-bottom:8px;",
          "ranking-progress-fill":
            "height:100%;background:#352ee8;border-radius:3px;",
          "ranking-description":
            "font-family:'Inter',sans-serif;font-size:12px;color:#71717a;line-height:1.4;",
          "extended-rankings":
            "display:flex;flex-direction:column;gap:12px;margin:20px 0;",
          "extended-ranking-card":
            "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;margin-bottom:8px;",
          "extended-ranking-header":
            "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;",
          "extended-ranking-number":
            "font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#352ee8;letter-spacing:0.5px;",
          "extended-ranking-score":
            "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#18181b;background:rgba(0,0,0,0.05);padding:4px 10px;border-radius:8px;",
          "extended-ranking-name":
            "font-family:'EB Garamond',Georgia,serif;font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;line-height:1.3;",
          "extended-ranking-details":
            "display:flex;flex-direction:column;gap:6px;",
          "extended-ranking-detail":
            "font-family:'Inter',sans-serif;font-size:12px;color:#a1a1aa;line-height:1.5;",
          "allocation-profiles":
            "display:flex;flex-direction:column;gap:16px;margin:20px 0;",
          "allocation-card":
            "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin-bottom:8px;",
          "allocation-title":
            "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#71717a;letter-spacing:0.5px;margin-bottom:12px;",
          "allocation-divider":
            "width:100%;height:1px;background:#e4e4e7;margin-bottom:16px;",
          "allocation-items": "display:flex;flex-direction:column;gap:14px;",
          "allocation-item": "display:flex;flex-direction:column;gap:6px;",
          "allocation-label":
            "display:flex;justify-content:space-between;align-items:center;",
          "allocation-category":
            "font-family:'Inter',sans-serif;font-size:13px;color:#a1a1aa;",
          "allocation-percentage":
            "font-family:'JetBrains Mono',monospace;font-size:12px;color:#18181b;font-weight:600;",
          "allocation-progress-bar":
            "width:100%;height:4px;background:rgba(0,0,0,0.05);border-radius:2px;overflow:hidden;",
          "allocation-progress-fill":
            "height:100%;background:#352ee8;border-radius:2px;",
          "allocation-focus":
            "margin-top:16px;padding-top:16px;border-top:1px solid #e4e4e7;",
          "allocation-focus-label":
            "font-family:'Inter',sans-serif;font-size:12px;color:#71717a;margin-bottom:8px;",
          "allocation-focus-artists":
            "display:flex;flex-direction:column;gap:4px;",
          "allocation-artist":
            "font-family:'EB Garamond',Georgia,serif;font-size:13px;color:#a1a1aa;line-height:1.4;",
          "ascii-table-wrapper":
            "margin:16px 0;border-radius:14px;overflow:hidden;",
          "ascii-table":
            "width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:14px;",
          "label-cell":
            "padding:12px 16px;font-size:13px;color:#18181b;font-weight:400;min-width:120px;border-bottom:1px solid #f4f4f5;",
          "value-cell":
            "padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#18181b;text-align:right;border-bottom:1px solid #f4f4f5;",
          "table-scroll-wrapper": "overflow-x:auto;margin:16px 0;",
          "premium-table-container": "",
        };
        for (const [cls, style] of Object.entries(classToStyle)) {
          if (!style) continue;
          html = html.replace(
            new RegExp(`class="([^"]*\\b${cls}\\b[^"]*)"`, "g"),
            (match) => {
              return `${match} style="${style}"`;
            },
          );
        }

        const tagStyles: Record<string, string> = {
          h1: "font-family:'EB Garamond',Georgia,serif;font-size:1.75rem;font-weight:500;color:#18181b;margin:8px 0 16px;letter-spacing:-0.01em;line-height:1.2;",
          h2: "font-family:'EB Garamond',Georgia,serif;font-size:1.25rem;font-weight:500;color:#18181b;margin:20px 0 12px;line-height:1.3;",
          h3: "font-family:'EB Garamond',Georgia,serif;font-size:0.95rem;font-weight:500;color:#52525b;margin:16px 0 12px;",
          h4: "font-family:'EB Garamond',Georgia,serif;font-size:0.875rem;font-weight:500;color:#52525b;margin:14px 0 10px;",
          p: "margin-bottom:12px;line-height:1.7;color:#18181b;font-family:'Inter',sans-serif;font-size:13px;",
          strong: "color:#18181b;font-weight:600;",
          em: "font-style:italic;color:#52525b;",
          a: "color:#352ee8;text-decoration:none;",
          ul: "list-style:disc;margin:12px 0;padding-left:20px;",
          ol: "margin:12px 0;padding-left:20px;",
          li: "margin-bottom:6px;font-size:13px;color:#18181b;font-family:'Inter',sans-serif;line-height:1.7;",
          blockquote:
            "border-left:2px solid #c4a97d;padding-left:14px;margin:16px 0;",
          hr: "border:none;border-top:1px solid #e5e0d8;margin:20px 0;",
          code: "font-family:'JetBrains Mono',monospace;font-size:11px;color:#71717a;background:#f4f4f5;padding:2px 6px;border:1px solid #e4e4e7;border-radius:4px;",
          pre: "background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin-bottom:12px;overflow-x:auto;",
        };
        for (const [tag, style] of Object.entries(tagStyles)) {
          html = html.replace(
            new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, "g"),
            `<${tag}$1 style="${style}">`,
          );
        }
        html = html.replace(/<pre[^>]*>\s*<code/g, (match) => {
          return match.replace(
            /<code/g,
            "<code style=\"font-family:'JetBrains Mono',monospace;font-size:12px;color:#52525b;background:transparent;border:none;padding:0;white-space:pre-wrap;line-height:1.4;\"",
          );
        });

        const tableTagStyles: Record<string, string> = {
          table:
            "width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e4e4e7;",
          thead: "background:#f9f7f4;",
          th: "padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;font-family:'Inter',sans-serif;",
          td: "padding:10px 14px;font-size:13px;color:#18181b;border-bottom:1px solid #f4f4f5;font-family:'Inter',sans-serif;",
          tr: "border-bottom:1px solid #f4f4f5;",
        };
        for (const [tag, style] of Object.entries(tableTagStyles)) {
          html = html.replace(
            new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, "g"),
            `<${tag}$1 style="${style}">`,
          );
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const fullHtml = `
          <div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;color:#18181b;line-height:1.7;padding:20px;">
            <div style="text-align:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #c4a97d;">
              <h1 style="font-family:'EB Garamond',Georgia,serif;font-size:22px;font-weight:600;margin:0 0 4px 0;color:#18181b;">Prophetic Orchestra</h1>
              <p style="font-family:'Inter',sans-serif;font-size:12px;color:#888;margin:0;">Report &mdash; ${dateStr}</p>
            </div>
            <div>${html}</div>
          </div>
        `;

        const filename = `prophetic-report-${now.toISOString().slice(0, 10)}.pdf`;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const worker = (html2pdf() as any)
          .set({
            margin: [15, 15, 15, 15],
            filename,
            image: { type: "jpeg", quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] },
          })
          .from(fullHtml, "string");

        if (isIOS) {
          const blob: Blob = await worker.outputPdf("blob");
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
        } else {
          await worker.save();
        }

        toast.success("PDF report downloaded");
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast.error("Failed to generate PDF report");
      } finally {
        setPdfLoading(false);
      }
    };

    return (
      <div
        className={`flex gap-2 sm:gap-4 items-start w-full ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        data-message-id={message.id}
      >
        {message.sender === "ai" && <AIAvatar />}
        <div
          className={`group flex flex-col gap-2 ${message.sender === "ai" ? "w-full" : ""}`}
        >
          <div
            className={`py-4 sm:py-5 rounded-2xl overflow-hidden ${
              message.sender === "user"
                ? "bg-[rgb(230,220,210)] dark:bg-gray-700 text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4"
                : "bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4"
            }`}
          >
            {message.sender === "user" ? (
              <Suspense
                fallback={
                  <div className="text-base text-gray-400">Loading...</div>
                }
              >
                <Markdown content={message.content} className="text-base" />
              </Suspense>
            ) : message.type === "artist_info" && message.artist ? (
              <Suspense
                fallback={
                  <div className="text-base text-gray-400">Loading...</div>
                }
              >
                <ArtistCard
                  artist={message.artist}
                  message={message.message}
                  researchType={message.research_type}
                  text={message.text}
                  streamingText={message.streaming_text}
                  hasExistingData={message.has_existing_data}
                />
              </Suspense>
            ) : (
              <>
                {message.content && (
                  <Suspense
                    fallback={
                      <div className="text-base text-gray-400">Loading...</div>
                    }
                  >
                    <Markdown
                      content={message.content}
                      className="text-base"
                      categoryName={
                        message.vignetteCategory
                          ? CATEGORY_DISPLAY_NAMES[message.vignetteCategory]
                          : undefined
                      }
                      onCategoryClick={
                        message.vignetteCategory && handleBackToCategory
                          ? () =>
                              handleBackToCategory(message.vignetteCategory!)
                          : undefined
                      }
                    />
                  </Suspense>
                )}

                {message.marketplace_data &&
                  (!message.marketplace_position ||
                    message.marketplace_position === "after") && (
                    <div className={message.content ? "mt-4" : ""}>
                      <Suspense
                        fallback={
                          <div className="text-base text-gray-400">
                            Loading marketplace data...
                          </div>
                        }
                      >
                        <MarketplaceCard data={message.marketplace_data} />
                      </Suspense>
                    </div>
                  )}

                {message.marketplace_data &&
                  message.marketplace_position === "before" && (
                    <div className={message.content ? "mb-4" : ""}>
                      <Suspense
                        fallback={
                          <div className="text-base text-gray-400">
                            Loading marketplace data...
                          </div>
                        }
                      >
                        <MarketplaceCard data={message.marketplace_data} />
                      </Suspense>
                    </div>
                  )}

                {message.real_estate_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <Suspense
                      fallback={
                        <div className="text-base text-gray-400">
                          Loading real estate data...
                        </div>
                      }
                    >
                      <RealEstateCard data={message.real_estate_data} />
                    </Suspense>
                  </div>
                )}

                {message.vignette_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <Suspense
                      fallback={
                        <div className="text-base text-gray-400">
                          Loading vignettes...
                        </div>
                      }
                    >
                      <VignetteGridCard
                        data={message.vignette_data}
                        onVignetteClick={onVignetteClick}
                      />
                    </Suspense>
                  </div>
                )}

                {message.clothes_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <Suspense
                      fallback={
                        <div className="text-base text-gray-400">
                          Loading fashion items...
                        </div>
                      }
                    >
                      <ClothesSearchCard data={message.clothes_search_data} />
                    </Suspense>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={`h-7 w-7 sm:h-8 sm:w-8 ${
                message.sender === "user"
                  ? "text-gray-500 hover:bg-black/5 dark:text-white dark:hover:bg-white/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            {message.sender === "ai" && message.content && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportPdf}
                disabled={pdfLoading}
                className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Export as PDF"
              >
                <FileDown
                  className={`h-3 w-3 sm:h-4 sm:w-4 ${pdfLoading ? "animate-pulse" : ""}`}
                />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

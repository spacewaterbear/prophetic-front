"use client";

import { lazy, memo, useState } from "react";
import { Check, Copy, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AIAvatar } from "./AIAvatar";
import { SuspenseCard } from "./SuspenseCard";
import { Message } from "@/types/chat";
import { useI18n } from "@/contexts/i18n-context";
import { getCategoryDisplayNames } from "@/lib/translations";
import { VignetteData } from "@/types/vignettes";
import { applyHtmlConversions } from "@/lib/markdown-utils";
import {
  PDF_CLASS_STYLES,
  PDF_TAG_STYLES,
  PDF_TABLE_TAG_STYLES,
  PDF_PRE_CODE_STYLE,
  PDF_DOCUMENT_WRAPPER_STYLE,
} from "@/lib/pdf-styles";

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
const JewelryCard = lazy(() =>
  import("@/components/JewelryCard").then((mod) => ({
    default: mod.JewelryCard,
  })),
);
const CarsCard = lazy(() =>
  import("@/components/CarsCard").then((mod) => ({
    default: mod.CarsCard,
  })),
);
const WatchesCard = lazy(() =>
  import("@/components/WatchesCard").then((mod) => ({
    default: mod.WatchesCard,
  })),
);
const WhiskyCard = lazy(() =>
  import("@/components/WhiskyCard").then((mod) => ({
    default: mod.WhiskyCard,
  })),
);
const WineCard = lazy(() =>
  import("@/components/WineCard").then((mod) => ({
    default: mod.WineCard,
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
    const { language, t } = useI18n();
    const categoryNames = getCategoryDisplayNames(language);
    const [copied, setCopied] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        toast.success(t("chat.copiedToClipboard"));
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
        toast.error(t("chat.failedToCopy"));
      }
    };

    const handleExportPdf = async () => {
      if (!message.content) return;
      setPdfLoading(true);
      try {
        const html2pdf = (await import("html2pdf.js")).default;
        const { marked } = await import("marked");

        let html = applyHtmlConversions(await marked(message.content));

        for (const [cls, style] of Object.entries(PDF_CLASS_STYLES)) {
          if (!style) continue;
          html = html.replace(
            new RegExp(`class="([^"]*\\b${cls}\\b[^"]*)"`, "g"),
            (match) => `${match} style="${style}"`,
          );
        }

        for (const [tag, style] of Object.entries(PDF_TAG_STYLES)) {
          html = html.replace(
            new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, "g"),
            `<${tag}$1 style="${style}">`,
          );
        }

        html = html.replace(/<pre[^>]*>\s*<code/g, (match) =>
          match.replace(/<code/g, `<code style="${PDF_PRE_CODE_STYLE}"`),
        );

        for (const [tag, style] of Object.entries(PDF_TABLE_TAG_STYLES)) {
          html = html.replace(
            new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, "g"),
            `<${tag}$1 style="${style}">`,
          );
        }

        // Strip all class attributes so dark-mode Tailwind/CSS-variable styles
        // cannot bleed into the PDF when the app is in dark mode.
        html = html.replace(/\s+class="[^"]*"/g, "");

        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const fullHtml = `
          <div style="${PDF_DOCUMENT_WRAPPER_STYLE}">
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
            html2canvas: {
              scale: 2,
              useCORS: true,
              backgroundColor: "#ffffff",
              onclone: (document: Document) => {
                document.documentElement.classList.remove("dark");
              },
            },
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
              <SuspenseCard>
                <Markdown content={message.content} className="text-base" />
              </SuspenseCard>
            ) : message.type === "artist_info" && message.artist ? (
              <SuspenseCard>
                <ArtistCard
                  artist={message.artist}
                  message={message.message}
                  researchType={message.research_type}
                  text={message.text}
                  streamingText={message.streaming_text}
                  hasExistingData={message.has_existing_data}
                />
              </SuspenseCard>
            ) : (
              <>
                {message.content && (
                  <SuspenseCard>
                    <Markdown
                      content={message.content}
                      className="text-base"
                      categoryName={
                        message.vignetteCategory
                          ? categoryNames[message.vignetteCategory]
                          : undefined
                      }
                      onCategoryClick={
                        message.vignetteCategory && handleBackToCategory
                          ? () =>
                              handleBackToCategory(message.vignetteCategory!)
                          : undefined
                      }
                    />
                  </SuspenseCard>
                )}

                {message.marketplace_data &&
                  (!message.marketplace_position ||
                    message.marketplace_position === "after") && (
                    <div className={message.content ? "mt-4" : ""}>
                      <SuspenseCard fallbackText="Loading marketplace data...">
                        <MarketplaceCard data={message.marketplace_data} />
                      </SuspenseCard>
                    </div>
                  )}

                {message.marketplace_data &&
                  message.marketplace_position === "before" && (
                    <div className={message.content ? "mb-4" : ""}>
                      <SuspenseCard fallbackText="Loading marketplace data...">
                        <MarketplaceCard data={message.marketplace_data} />
                      </SuspenseCard>
                    </div>
                  )}

                {message.real_estate_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading real estate data...">
                      <RealEstateCard data={message.real_estate_data} />
                    </SuspenseCard>
                  </div>
                )}

                {message.vignette_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading vignettes...">
                      <VignetteGridCard
                        data={message.vignette_data}
                        onVignetteClick={onVignetteClick}
                      />
                    </SuspenseCard>
                  </div>
                )}

                {message.clothes_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading fashion items...">
                      <ClothesSearchCard data={message.clothes_search_data} />
                    </SuspenseCard>
                  </div>
                )}
                {message.jewelry_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading jewelry...">
                      <JewelryCard data={message.jewelry_search_data} />
                    </SuspenseCard>
                  </div>
                )}
                {message.cars_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading cars...">
                      <CarsCard data={message.cars_search_data} />
                    </SuspenseCard>
                  </div>
                )}
                {message.watches_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading watches...">
                      <WatchesCard data={message.watches_search_data} />
                    </SuspenseCard>
                  </div>
                )}
                {message.whisky_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading whisky...">
                      <WhiskyCard data={message.whisky_search_data} />
                    </SuspenseCard>
                  </div>
                )}
                {message.wine_search_data && (
                  <div className={message.content ? "mt-4" : ""}>
                    <SuspenseCard fallbackText="Loading wine...">
                      <WineCard data={message.wine_search_data} />
                    </SuspenseCard>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 self-end">
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

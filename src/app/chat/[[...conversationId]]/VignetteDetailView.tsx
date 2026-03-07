"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, FileDown } from "lucide-react";
import { toast } from "sonner";
import { AIAvatar } from "@/components/chat/AIAvatar";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat-input";
import { AgentType, UserStatus } from "@/types/agents";
import { useI18n } from "@/contexts/i18n-context";
import { getCategoryDisplayNames } from "@/lib/translations";
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

const PENDING_VIGNETTE_VIEW_KEY = "pendingVignetteView";

interface VignetteViewParams {
  imageName: string;
  category: string;
  tier: string;
}

interface VignetteDetailViewProps {
  vignetteSlug: string;
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  selectedModel: string;
  userStatus: UserStatus | undefined;
}

export function VignetteDetailView({
  vignetteSlug,
  selectedAgent,
  onAgentChange,
  selectedModel,
  userStatus,
}: VignetteDetailViewProps) {
  const router = useRouter();
  const { language } = useI18n();
  const categoryNames = getCategoryDisplayNames(language);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [vignetteCategory, setVignetteCategory] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const streamStartedRef = useRef(false);

  useEffect(() => {
    if (streamStartedRef.current) return;

    const paramsStr = sessionStorage.getItem(PENDING_VIGNETTE_VIEW_KEY);

    if (!paramsStr) {
      // Direct URL access (e.g. copy-pasted link) — stream using the slug from the URL
      streamStartedRef.current = true;
      streamVignetteContent({
        imageName: vignetteSlug,
        category: "",
        tier: selectedAgent.toUpperCase(),
      });
      return;
    }

    streamStartedRef.current = true;
    sessionStorage.removeItem(PENDING_VIGNETTE_VIEW_KEY);

    let vignetteParams: VignetteViewParams;
    try {
      vignetteParams = JSON.parse(paramsStr);
    } catch {
      return;
    }

    setVignetteCategory(vignetteParams.category || undefined);
    streamVignetteContent(vignetteParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streamVignetteContent = async (vignetteParams: VignetteViewParams) => {
    setIsLoading(true);
    setStreamingMessage("");

    try {
      let queryParams: Record<string, string>;

      if (vignetteParams.category === "CASH_FLOW_LEASING") {
        queryParams = {
          type: "dependant-without-sub",
          category: "CASH_FLOW_LEASING",
          markdown_name: vignetteParams.imageName,
          tiers_level: vignetteParams.tier || "DISCOVER",
        };
      } else {
        queryParams = {
          type: "independant",
          root_folder: "VIGNETTES",
          markdown_name: vignetteParams.imageName,
          category: vignetteParams.category || "",
        };
      }

      const query = new URLSearchParams(queryParams);
      const response = await fetch(`/api/markdown?${query.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch markdown: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let documentContent = "";
        let questionsContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.trim()) continue;
            const lines = event.split("\n");
            let eventData = "";
            for (const line of lines) {
              if (line.startsWith("data: ")) eventData += line.slice(6);
            }

            if (!eventData || eventData === "[DONE]") continue;

            try {
              const parsed = JSON.parse(eventData);
              if (parsed.type === "document") {
                documentContent = parsed.content || "";
                setStreamingMessage(documentContent);
              } else if (parsed.type === "questions_chunk") {
                questionsContent += parsed.content || "";
                setStreamingMessage(documentContent + "\n\n" + questionsContent);
              } else if (parsed.type === "done") {
                const content = questionsContent
                  ? `${documentContent}\n\n${questionsContent}`
                  : documentContent;
                setFinalContent(content);
                setStreamingMessage("");
              }
            } catch (e) {
              console.error("[VignetteDetailView] Parse error:", e);
            }
          }
        }
      } else {
        const json = await response.json();
        const content = json.text || json.content || "";
        if (content) setFinalContent(content);
      }
    } catch (error) {
      console.error("[VignetteDetailView] Error streaming:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!finalContent) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(finalContent);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = finalContent;
        textArea.style.cssText =
          "position:fixed;left:-999999px;top:-999999px;opacity:0;";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleExportPdf = async () => {
    if (!finalContent) return;
    setPdfLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const { marked } = await import("marked");

      let html = await marked(finalContent);
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
          (match) => `${match} style="${style}"`,
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

  const handleSend = async (messageText?: string) => {
    const userInput = messageText || input;
    if (!userInput.trim() || isLoading) return;
    setInput("");
    setIsLoading(true);

    try {
      const title =
        userInput.length > 50 ? userInput.substring(0, 50) + "..." : userInput;

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, model: selectedModel }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");
      const data = await response.json();
      const newConversationId = data.conversation.id;

      if (finalContent) {
        sessionStorage.setItem(
          "pendingVignetteContent",
          JSON.stringify({ text: finalContent, vignetteCategory }),
        );
        fetch(`/api/conversations/${newConversationId}/vignette-content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ content: finalContent, vignetteCategory }],
          }),
        }).catch((e) =>
          console.error("[VignetteDetailView] Error saving vignette content:", e),
        );
      }

      sessionStorage.setItem(
        "pendingChatMessage",
        JSON.stringify({ content: userInput, scrollToTop: true }),
      );

      window.dispatchEvent(new Event("refreshConversations"));
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("[VignetteDetailView] Error creating conversation:", error);
      setIsLoading(false);
    }
  };

  const handleBackToCategory = (category: string) => {
    router.push(`/chat?category=${category}`);
  };

  const displayContent = finalContent || streamingMessage;
  const categoryName = vignetteCategory
    ? categoryNames[vignetteCategory]
    : undefined;

  const categoryNavTabs: Record<string, { label: string; onClick: (() => void) | undefined }[]> = {
    WINE: [
      { label: "Stratégie cave", onClick: undefined },
      { label: "Dynamiques vigne", onClick: undefined },
      { label: "Domaines viticoles", onClick: () => router.push("/chat/products?category=WINE&label=Domaines+viticoles") },
    ],
    SACS: [
      { label: "Portfolio cuir", onClick: undefined },
      { label: "Leasing + Exit", onClick: undefined },
      { label: "Pieces de luxe", onClick: () => router.push("/chat/products?category=SACS&label=Pieces+de+luxe") },
    ],
    IMMO_LUXE: [
      { label: "Observatoire foncier", onClick: undefined },
      { label: "Flux & Capital", onClick: undefined },
      { label: "Adresses d'exception", onClick: () => router.push("/chat/products?category=IMMO_LUXE&label=Adresses+d%27exception") },
    ],
    MONTRES_LUXE: [
      { label: "Portfolio horloger", onClick: undefined },
      { label: "Côte cadran", onClick: undefined },
      { label: "Maisons horlogeres", onClick: () => router.push("/chat/products?category=MONTRES_LUXE&label=Maisons+horlogeres") },
    ],
    CARS: [
      { label: "Garage patrimonial", onClick: undefined },
      { label: "Vigie concours", onClick: undefined },
      { label: "Ecuries légendaires", onClick: () => router.push("/chat/products?category=CARS&label=Ecuries+l%C3%A9gendaires") },
    ],
    SNEAKERS: [
      { label: "Griffes patrimoine", onClick: undefined },
      { label: "Pouls créateurs", onClick: undefined },
      { label: "Modèles iconiques", onClick: () => router.push("/chat/products?category=SNEAKERS&label=Mod%C3%A8les+iconiques") },
    ],
    WHISKY: [
      { label: "Coffre distilleries", onClick: undefined },
      { label: "Baromètre malts", onClick: undefined },
      { label: "Distilleries prestigieuses", onClick: () => router.push("/chat/products?category=WHISKY&label=Distilleries+prestigieuses") },
    ],
    BIJOUX: [
      { label: "Écrin patrimonial", onClick: undefined },
      { label: "Prisme pierres", onClick: undefined },
      { label: "Maison Joaillieres", onClick: () => router.push("/chat/products?category=BIJOUX&label=Maison+Joaillieres") },
    ],
    CARDS_US: [
      { label: "Séries cultes", onClick: undefined },
      { label: "Prisme tirages", onClick: undefined },
      { label: "Univers Collectibles", onClick: () => router.push("/chat/products?category=CARDS_US&label=Univers+Collectibles") },
    ],
    ART_CONTEMPORAIN: [
      { label: "Murs patrimoine", onClick: undefined },
      { label: "Arbitrage oeuvres", onClick: undefined },
      { label: "Créations d'exception", onClick: () => router.push("/chat/artists") },
    ],
  };
  const navTabs = vignetteCategory ? categoryNavTabs[vignetteCategory] : undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Category nav tabs */}
      {navTabs && (
        <div className="flex-shrink-0 flex items-center justify-center gap-6 px-6 py-3 border-b border-gray-200 dark:border-gray-800">
          {navTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className={`text-sm font-medium pb-0.5 transition-colors ${
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

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        <div className="w-full max-w-4xl flex flex-col items-center py-10 mx-auto">
          {displayContent ? (
            <div className="w-full max-w-5xl space-y-6 mb-8">
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="group flex flex-col gap-2 w-full">
                  <div className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl px-3 sm:px-4 py-4 sm:py-5 rounded-2xl overflow-hidden bg-[rgb(249,248,244)] dark:bg-[rgb(1,1,0)] text-gray-900 dark:text-white">
                    <Suspense
                      fallback={
                        <div className="text-base text-gray-400">Loading...</div>
                      }
                    >
                      <Markdown
                        content={displayContent}
                        className="text-base"
                        categoryName={categoryName}
                        onCategoryClick={
                          vignetteCategory
                            ? () => handleBackToCategory(vignetteCategory)
                            : undefined
                        }
                      />
                    </Suspense>
                  </div>
                  {finalContent && (
                    <div className="flex items-center gap-1 self-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="w-full max-w-5xl space-y-6 mb-8">
              <div className="flex gap-2 sm:gap-4 items-start justify-start">
                <AIAvatar />
                <div className="flex items-center gap-2 px-4 py-4">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Input pinned at bottom */}
      <div className="flex-shrink-0 w-full px-6 py-3 sm:py-4 bg-[rgb(249,248,244)] dark:bg-black flex justify-center">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          isLoading={isLoading}
          userStatus={userStatus}
          selectedAgent={selectedAgent}
          onAgentChange={onAgentChange}
          className="max-w-3xl"
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonProps {
  conversationId: number | null;
  disabled?: boolean;
}

export function ShareButton({ conversationId, disabled }: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Fallback copy method for when Clipboard API fails
  const copyToClipboardFallback = (text: string): boolean => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand("copy");
      document.body.removeChild(textArea);
      return result;
    } catch (error) {
      console.error("Fallback copy failed:", error);
      return false;
    }
  };

  const handleShare = async () => {
    if (!conversationId) {
      toast.error("No conversation to share");
      return;
    }

    setIsLoading(true);

    try {
      // Call the share API to create a share token
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create share link");
      }

      const { shareUrl } = await response.json();

      // Try to copy using modern Clipboard API
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Conversation link copied to clipboard!");
      } catch (clipboardError) {
        // Fallback to older method if Clipboard API fails (e.g., document not focused)
        console.warn("Clipboard API failed, using fallback:", clipboardError);
        const fallbackSuccess = copyToClipboardFallback(shareUrl);

        if (fallbackSuccess) {
          toast.success("Conversation link copied to clipboard!");
        } else {
          // If both methods fail, show the URL for manual copy
          toast.info(`Share link: ${shareUrl}`, {
            duration: 10000,
            description: "Click to select, then copy manually"
          });
        }
      }
    } catch (error) {
      console.error("Failed to create share link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleShare}
      disabled={disabled || !conversationId || isLoading}
      className="h-9 w-9"
      title={
        conversationId
          ? "Share conversation"
          : "Start a conversation to share"
      }
    >
      <Share2 className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
    </Button>
  );
}

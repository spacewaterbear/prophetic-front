"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

export function SelectionContextMenu() {
    const { t } = useI18n();
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState("");

    const handleContextMenu = useCallback((e: MouseEvent) => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
            e.preventDefault();
            setSelectedText(text);
            setPosition({ x: e.clientX, y: e.clientY });
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, []);

    const handleClick = useCallback(() => {
        setIsVisible(false);
    }, []);

    useEffect(() => {
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("click", handleClick);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("click", handleClick);
        };
    }, [handleContextMenu, handleClick]);

    const triggerDeepSearch = () => {
        if (!selectedText) return;

        // Dispatch custom event for the chat page to catch
        const event = new CustomEvent("triggerDeepSearch", {
            detail: { text: selectedText }
        });
        window.dispatchEvent(event);
        setIsVisible(false);

        // Clear selection
        window.getSelection()?.removeAllRanges();
    };

    if (!isVisible) return null;

    return (
        <div
            className="fixed z-[9999] bg-white dark:bg-[#1e1f20] border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] animate-in fade-in zoom-in duration-100"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            <button
                onClick={triggerDeepSearch}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left font-medium"
            >
                <Search className="h-4 w-4 text-blue-500" />
                <span>{t("contextMenu.deepSearch")}</span>
            </button>
        </div>
    );
}

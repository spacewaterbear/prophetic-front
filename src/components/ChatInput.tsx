"use client";

import { Button } from "@/components/ui/button";
import { Plus, Send } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    handleSend: () => void;
    isLoading: boolean;
    className?: string;
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({ input, setInput, handleSend, isLoading, className = "", textareaRef }: ChatInputProps) {
    const { theme, resolvedTheme } = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const ref = textareaRef || internalRef;
    const [textareaHeight, setTextareaHeight] = useState<number>(24);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = ref.current;
        if (!textarea) return;

        const LINE_HEIGHT = 24;
        const MAX_ROWS = 7;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;
        const maxPixelHeight = LINE_HEIGHT * MAX_ROWS;

        const newHeight = Math.min(Math.max(scrollHeight, LINE_HEIGHT), maxPixelHeight);

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
            {/* Textarea Area */}
            <div className="w-full mb-2">
                <textarea
                    ref={ref}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.placeholder')}
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-gray-500 text-gray-900 dark:text-white text-base leading-6 overflow-y-auto max-h-[168px] discret-scrollbar"
                    style={{
                        minHeight: '24px',
                    }}
                    rows={1}
                />
            </div>

            {/* Toolbar Area - Icons below text */}
            <div className="flex justify-between items-center w-full">
                {/* Leading Actions (Left side) */}
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <button
                            className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full p-2.5 transition-colors"
                            aria-label="Add file"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {t('chat.comingSoon')}
                        </div>
                    </div>

                    {/* Prophetic Logo Button */}
                    <div className="relative">
                        <button
                            type="button"
                            data-dashlane-ignore="true"
                            className="flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full p-2 transition-colors cursor-pointer"
                            onClick={(e) => e.preventDefault()}
                            onMouseEnter={() => setIsDropdownOpen(true)}
                        >
                            <Image
                                src={
                                    mounted && isDark
                                        ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                                        : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                                }
                                alt="Prophetic"
                                width={20}
                                height={20}
                                className="w-5 h-5 opacity-50"
                            />
                        </button>

                        {/* Orchestra Collections Dropdown */}
                        <div
                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-opacity z-10 ${isDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            onMouseEnter={() => setIsDropdownOpen(true)}
                            onMouseLeave={() => setIsDropdownOpen(false)}
                        >
                            <div className="bg-[#2a2b2c] text-white rounded-3xl p-4 w-[420px] shadow-2xl">
                                {/* Orchestra Edge */}
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-medium">Orchestra Edge</span>
                                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30">
                                            Max
                                        </span>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>

                                {/* Orchestra Vault */}
                                <div className="flex items-center justify-between mb-4 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-medium">Orchestra Vault</span>
                                        <span className="px-3 py-1 bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/30">
                                            Pro Max
                                        </span>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>

                                {/* Selected: Orchestra Edge */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="text-sm text-gray-300">Orchestra Edge</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed mb-4 italic">
                                        Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
                                    </p>
                                </div>

                                {/* Collection Tags */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        FIRST COLLECTION
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        ARCHIVES TREASURES
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        ART SMALL
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        ARCHITECTE FLEX
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        CINEMA ICONS
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        LEGENDARY PIECES
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        PLACE VENDÔME POWER
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        ARTIST BOTTLES
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        DISTILLERY LEGENDS
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        CRAFT REVOLUTION
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        NATURAL WAVE
                                    </span>
                                    <span className="px-3 py-1.5 bg-transparent text-white text-xs font-medium rounded-full border border-gray-600 hover:border-gray-500 transition-colors">
                                        DAILY LUXURY
                                    </span>
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-3 border-t border-gray-700/50">
                                    <p className="text-xs text-gray-500">+1800 insights available</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trailing Actions (Right side) */}
                <div className="flex items-center gap-2">


                    {input.trim() ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent focusing textarea when clicking send
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
        </div>
    );
}

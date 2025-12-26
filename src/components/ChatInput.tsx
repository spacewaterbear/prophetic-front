"use client";

import { Button } from "@/components/ui/button";
import { Plus, Send, ChevronDown } from "lucide-react";
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
    userStatus?: 'unauthorized' | 'free' | 'paid' | 'admini' | 'discover' | 'intelligence' | 'oracle';
    selectedAgent?: 'discover' | 'intelligence' | 'oracle';
    onAgentChange?: (agent: 'discover' | 'intelligence' | 'oracle') => void;
}

export function ChatInput({ input, setInput, handleSend, isLoading, className = "", textareaRef, userStatus = 'discover', selectedAgent = 'discover', onAgentChange }: ChatInputProps) {
    const { theme, resolvedTheme } = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const ref = textareaRef || internalRef;
    const [textareaHeight, setTextareaHeight] = useState<number>(24);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper function to determine which agents are available based on user status
    const getAvailableAgents = () => {
        // Treat 'free' as 'discover' (deprecated status)
        const status = userStatus === 'free' ? 'discover' : userStatus;

        switch (status) {
            case 'discover':
                return ['discover'];
            case 'intelligence':
                return ['discover', 'intelligence'];
            case 'oracle':
            case 'admini':
                return ['discover', 'intelligence', 'oracle'];
            default:
                return ['discover']; // Default to discover for unauthorized or unknown
        }
    };

    const availableAgents = getAvailableAgents();

    const handleAgentClick = (agent: 'discover' | 'intelligence' | 'oracle') => {
        if (availableAgents.includes(agent) && onAgentChange) {
            onAgentChange(agent);
        }
    };

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
                    <div className="static sm:relative">
                        <button
                            type="button"
                            data-dashlane-ignore="true"
                            className="flex items-center gap-2 bg-[#352ee8] hover:bg-[#2920c7] rounded-full px-3 py-2 transition-colors cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // Prevent parent onClick from focusing textarea
                                setIsDropdownOpen(!isDropdownOpen);
                            }}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only auto-open on hover for desktop (non-touch devices)
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsDropdownOpen(true);
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsDropdownOpen(false);
                                    }, 100);
                                }
                            }}
                        >
                            <Image
                                src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
                                alt="Prophetic"
                                width={20}
                                height={20}
                                className="w-5 h-5"
                            />
                            <span className="text-white font-medium text-sm capitalize">{selectedAgent} mode</span>
                            <ChevronDown className="h-4 w-4 text-white" />
                        </button>

                        {/* Subscription Tiers Dropdown/Bottom Sheet */}
                        {/* Backdrop for mobile */}
                        {isDropdownOpen && (
                            <div
                                className="sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                        )}

                        <div
                            className={`
                                sm:absolute sm:bottom-full sm:left-1/2 sm:-translate-x-1/2 sm:mb-2
                                fixed bottom-0 left-0 right-0 sm:static
                                transition-all duration-300 ease-out
                                z-50 sm:z-10
                                ${isDropdownOpen
                                    ? 'opacity-100 translate-y-0 sm:translate-y-0'
                                    : 'opacity-0 translate-y-full sm:translate-y-0 pointer-events-none'
                                }
                            `}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only keep open on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsDropdownOpen(true);
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsDropdownOpen(false);
                                    }, 100);
                                }
                            }}
                        >
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl p-5 w-full sm:w-[420px] shadow-2xl border-t border-gray-200 sm:border dark:border-transparent max-h-[80vh] overflow-y-auto">
                                {/* Discover Agent */}
                                <div
                                    className={`mb-4 p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer ${selectedAgent === 'discover' ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                    onClick={() => handleAgentClick('discover')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-900 dark:text-white font-semibold text-base">DISCOVER</span>
                                        </div>
                                        {selectedAgent === 'discover' && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Active</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                        Explore assets. Spot trends
                                    </p>
                                </div>

                                {/* Intelligence Agent */}
                                <div
                                    className={`mb-4 p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${availableAgents.includes('intelligence') ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                                        } ${selectedAgent === 'intelligence' ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                    onClick={() => handleAgentClick('intelligence')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-900 dark:text-white font-semibold text-base">INTELLIGENCE</span>
                                        </div>
                                        {availableAgents.includes('intelligence') ? (
                                            selectedAgent === 'intelligence' && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Active</span>
                                                </div>
                                            )
                                        ) : (
                                            <button
                                                className="px-4 py-1.5 bg-[#352ee8] text-white text-sm font-medium rounded-full hover:bg-[#2920c7] transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Upgrade
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                        Predict value. Invest smarter
                                    </p>
                                </div>

                                {/* Oracle Agent */}
                                <div
                                    className={`p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${availableAgents.includes('oracle') ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                                        } ${selectedAgent === 'oracle' ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                    onClick={() => handleAgentClick('oracle')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-900 dark:text-white font-semibold text-base">ORACLE</span>
                                        </div>
                                        {availableAgents.includes('oracle') ? (
                                            selectedAgent === 'oracle' && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Active</span>
                                                </div>
                                            )
                                        ) : (
                                            <button
                                                className="px-4 py-1.5 bg-[#352ee8] text-white text-sm font-medium rounded-full hover:bg-[#2920c7] transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Upgrade
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                        Lead the market. Multiply wealth
                                    </p>
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

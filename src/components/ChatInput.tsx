"use client";

import { Button } from "@/components/ui/button";
import { Plus, Send, ChevronDown, Paperclip, Mic, Settings2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/i18n-context";
import { createPortal } from "react-dom";
import { FileUploadPreview, AttachedFile } from "@/components/FileUploadPreview";
import { uploadWithRetry, deleteFile } from "@/lib/supabase/storage";
import { validateFile } from "@/lib/utils/fileValidation";
import { toast } from "sonner";
// import { useGoogleDrivePicker } from "@/components/GoogleDrivePicker"; // Removed for now, will be implemented later

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
    userId?: string;
    conversationId?: number | null;
    attachedFiles?: AttachedFile[];
    onFilesChange?: (files: AttachedFile[]) => void;
    onFlashcardClick?: (flashCards: string, question: string, flashCardType: 'flash_invest' | 'ranking' | 'portfolio') => void;
    onPortfolioClick?: () => void;
}

// Flashcard category mapping to API enum values
const FLASHCARD_MAPPING: Record<string, { flash_cards: string; question: string }> = {
    "Contemporary Art": { flash_cards: "art", question: "art" },
    "Contemp. Art": { flash_cards: "art", question: "art" },
    "Prestigious Wines": { flash_cards: "wine", question: "wine" },
    "Luxury Bags": { flash_cards: "sacs", question: "sacs" },
    "Precious Jewelry": { flash_cards: "bijoux", question: "bijoux" },
    "Luxury Watch": { flash_cards: "montres_luxe", question: "montres_luxe" },
    "Collectible Cars": { flash_cards: "cars", question: "cars" },
    "Limited Sneakers": { flash_cards: "sneakers", question: "sneakers" },
    "Rare Whiskey": { flash_cards: "whisky", question: "whisky" },
    "Real Estate": { flash_cards: "immo_luxe", question: "immo_luxe" },
    "US sports cards": { flash_cards: "cards_us", question: "cards_us" }
};

// Shared button styles - single source of truth for all modal buttons
const CARD_BUTTON_STYLES = "p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] text-gray-900 dark:text-white text-sm font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border border-gray-400/60 dark:border-gray-600/60";

const MODE_CARD_BASE_STYLES = "mb-4 p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-gray-400/60 dark:border-gray-600/60";

// Reusable CategoryButton component for investment categories
interface CategoryButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
    isDisabled?: boolean;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ children, onClick, isActive = false, isDisabled = false }) => {
    const activeStyles = isActive ? 'ring-2 ring-blue-500' : '';

    // Build className conditionally to avoid hover effects when disabled
    const buttonStyles = isDisabled
        ? 'p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] text-gray-900 dark:text-white text-sm font-semibold rounded-2xl border border-gray-400/60 dark:border-gray-600/60 opacity-50 cursor-not-allowed'
        : `${CARD_BUTTON_STYLES}`;

    const handleClick = () => {
        if (!isDisabled && onClick) {
            onClick();
        }
    };

    return (
        <button className={`${buttonStyles} ${activeStyles}`} onClick={handleClick} disabled={isDisabled}>
            {children}
        </button>
    );
};

// Reusable ModeCard component for mode selection
interface ModeCardProps {
    title: string;
    price: string;
    description: string;
    isActive: boolean;
    isAvailable: boolean;
    onClick: () => void;
    isMobile?: boolean;
}

const ModeCard: React.FC<ModeCardProps> = ({
    title,
    price,
    description,
    isActive,
    isAvailable,
    onClick,
    isMobile = false
}) => {
    const availabilityStyles = !isAvailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';
    const activeStyles = isActive ? 'ring-2 ring-blue-500' : '';
    const mobileStyles = isMobile ? 'active:scale-95 active:brightness-95 transition-all duration-150' : '';

    const handleClick = (e: React.MouseEvent) => {
        if (isMobile && isAvailable) {
            const element = e.currentTarget as HTMLElement;
            element.style.transform = 'scale(0.95)';
            setTimeout(() => {
                element.style.transform = '';
                onClick();
            }, 100);
        } else if (isAvailable) {
            onClick();
        }
    };

    return (
        <div
            className={`${MODE_CARD_BASE_STYLES} ${availabilityStyles} ${activeStyles} ${mobileStyles}`}
            onClick={handleClick}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white font-semibold text-base">
                        {title} - {price}
                    </span>
                </div>
                {isAvailable ? (
                    isActive && (
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
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">{description}</p>
        </div>
    );
};

export function ChatInput({ input, setInput, handleSend, isLoading, className = "", textareaRef, userStatus = 'discover', selectedAgent = 'discover', onAgentChange, userId, conversationId, attachedFiles = [], onFilesChange, onFlashcardClick, onPortfolioClick }: ChatInputProps) {
    const { theme, resolvedTheme } = useTheme();
    const isDark = theme === "dark" || resolvedTheme === "dark";
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const ref = textareaRef || internalRef;
    const [textareaHeight, setTextareaHeight] = useState<number>(24);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
    const [isChronoOpen, setIsChronoOpen] = useState(false);
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [marketScoutEnabled, setMarketScoutEnabled] = useState(false);
    const [communityRadarEnabled, setCommunityRadarEnabled] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [mobileMenuLevel, setMobileMenuLevel] = useState<'main' | 'flashcards' | 'ranking'>('main');
    const [desktopMenuLevel, setDesktopMenuLevel] = useState<'main' | 'chrono' | 'ranking'>('main');

    // Google Drive picker hook - Commented out for now, will be implemented later
    // const { openGoogleDrivePicker } = useGoogleDrivePicker(
    //     (files) => handleGoogleDriveFiles(files),
    //     (error) => toast.error(`Google Drive error: ${error}`)
    // );

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

    const handleFlashcardClick = (category: string, flashCardType: 'flash_invest' | 'ranking' | 'portfolio' = 'flash_invest') => {
        const mapping = FLASHCARD_MAPPING[category];
        if (mapping && onFlashcardClick) {
            onFlashcardClick(mapping.flash_cards, mapping.question, flashCardType);
            setIsChronoOpen(false);
            setIsRankingOpen(false);
        }
    };

    // Google Drive file handler - Commented out for now, will be implemented later
    // const handleGoogleDriveFiles = async (files: File[]) => {
    //     await processFiles(files);
    // };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        await processFiles(files);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const processFiles = async (files: File[]) => {
        if (!userId) {
            toast.error("Please log in to upload files");
            return;
        }

        for (const file of files) {
            const validation = validateFile(file);
            if (!validation.valid) {
                toast.error(validation.error || "Invalid file");
                continue;
            }

            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newFile: AttachedFile = {
                id: fileId,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadStatus: 'uploading',
                uploadProgress: 0
            };

            const updatedFiles = [...attachedFiles, newFile];
            onFilesChange?.(updatedFiles);

            try {
                const uploaded = await uploadWithRetry(file, userId, conversationId || null, 3, (progress) => {
                    onFilesChange?.(
                        updatedFiles.map(f =>
                            f.id === fileId ? { ...f, uploadProgress: progress } : f
                        )
                    );
                });

                onFilesChange?.(
                    updatedFiles.map(f =>
                        f.id === fileId
                            ? { ...f, uploadStatus: 'completed', uploadProgress: 100, url: uploaded.url, path: uploaded.path }
                            : f
                    )
                );

                toast.success(`${file.name} uploaded successfully`);
            } catch (error) {
                console.error('Upload error:', error);
                onFilesChange?.(
                    updatedFiles.map(f =>
                        f.id === fileId
                            ? { ...f, uploadStatus: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
                            : f
                    )
                );
                toast.error(`Failed to upload ${file.name}`);
            }
        }
    };

    const handleRemoveFile = async (fileId: string) => {
        const file = attachedFiles.find(f => f.id === fileId);
        if (file?.path) {
            try {
                await deleteFile(file.path);
            } catch (error) {
                console.error('Delete error:', error);
            }
        }
        onFilesChange?.(attachedFiles.filter(f => f.id !== fileId));
    };

    const handleRetryUpload = async (fileId: string) => {
        if (!userId) return;

        const file = attachedFiles.find(f => f.id === fileId);
        if (!file) return;

        onFilesChange?.(
            attachedFiles.map(f =>
                f.id === fileId ? { ...f, uploadStatus: 'uploading', uploadProgress: 0, error: undefined } : f
            )
        );

        try {
            const uploaded = await uploadWithRetry(file.file, userId, conversationId || null, 3, (progress) => {
                onFilesChange?.(
                    attachedFiles.map(f =>
                        f.id === fileId ? { ...f, uploadProgress: progress } : f
                    )
                );
            });

            onFilesChange?.(
                attachedFiles.map(f =>
                    f.id === fileId
                        ? { ...f, uploadStatus: 'completed', uploadProgress: 100, url: uploaded.url, path: uploaded.path }
                        : f
                )
            );

            toast.success(`${file.name} uploaded successfully`);
        } catch (error) {
            console.error('Upload error:', error);
            onFilesChange?.(
                attachedFiles.map(f =>
                    f.id === fileId
                        ? { ...f, uploadStatus: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
                        : f
                )
            );
            toast.error(`Failed to upload ${file.name}`);
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
            className={`relative flex flex-col w-full max-w-5xl mx-auto bg-[#f8f8f8] dark:bg-[#1e1f20] rounded-[32px] p-0 shadow-sm transition-colors border border-gray-200/50 dark:border-gray-800/50 ${className}`}
            onClick={() => ref.current?.focus()}
        >
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

            {/* Main Input Container - Adjusted for the two-row layout from the image */}
            <div className="flex flex-col w-full p-2">
                {/* Top Row: Input Area */}
                <div className="w-full flex items-center pt-2 px-4">
                    <textarea
                        ref={ref}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chat.placeholder')}
                        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 text-[17px] leading-relaxed overflow-y-auto max-h-[168px] discret-scrollbar"
                        style={{
                            minHeight: '24px',
                        }}
                        rows={1}
                    />
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-between w-full mt-1.5 px-2">
                    {/* Left-side tools */}
                    <div className="flex items-center gap-1">
                        {/* Plus Button */}
                        <div className="relative">
                            <button
                                className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 ${isFileUploadOpen
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                aria-label="Add file"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsFileUploadOpen(!isFileUploadOpen);
                                    setIsDropdownOpen(false);
                                    setIsSettingsOpen(false);
                                }}
                                onMouseEnter={() => {
                                    if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                    }
                                    if (window.matchMedia('(hover: hover)').matches) {
                                        setIsFileUploadOpen(true);
                                        setIsDropdownOpen(false);
                                        setIsChronoOpen(false);
                                        setIsRankingOpen(false);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (window.matchMedia('(hover: hover)').matches) {
                                        closeTimeoutRef.current = setTimeout(() => {
                                            setIsFileUploadOpen(false);
                                        }, 100);
                                    }
                                }}
                            >
                                <Plus className="h-[21px] w-[21px]" />
                            </button>

                            {/* Desktop Dropdown for Plus */}
                            <div
                                className={`
                                hidden sm:block
                                absolute left-0 bottom-full mb-3
                                transition-all duration-300 ease-out
                                z-10
                                ${isFileUploadOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                            `}
                                onMouseEnter={() => {
                                    if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                    }
                                    setIsFileUploadOpen(true);
                                }}
                                onMouseLeave={() => {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsFileUploadOpen(false);
                                    }, 100);
                                }}
                            >
                                <div className="bg-white dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[300px] shadow-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 px-1">Upload files and assets</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
                                    >
                                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Paperclip className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium">Attach Files</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Outils Button */}
                        <div className="relative">
                            <button
                                className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-200 group ${isSettingsOpen
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsSettingsOpen(!isSettingsOpen);
                                    setIsDropdownOpen(false);
                                    setIsFileUploadOpen(false);
                                    setDesktopMenuLevel('main');
                                }}
                                onMouseEnter={() => {
                                    if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                    }
                                    if (window.matchMedia('(hover: hover)').matches) {
                                        setIsSettingsOpen(true);
                                        setIsDropdownOpen(false);
                                        setIsFileUploadOpen(false);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (window.matchMedia('(hover: hover)').matches) {
                                        closeTimeoutRef.current = setTimeout(() => {
                                            setIsSettingsOpen(false);
                                        }, 100);
                                    }
                                }}
                            >
                                <Settings2 className="h-[21px] w-[21px]" />
                                <span className="text-sm font-medium">Outils</span>
                            </button>

                            {/* Outils Dropdown (Settings) */}
                            <div
                                className={`
                                hidden sm:block
                                absolute left-0 bottom-full mb-3
                                transition-all duration-300 ease-out
                                z-10
                                ${isSettingsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                            `}
                                onMouseEnter={() => {
                                    if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                    }
                                    setIsSettingsOpen(true);
                                }}
                                onMouseLeave={() => {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsSettingsOpen(false);
                                        // Reset to main level after closing
                                        setTimeout(() => setDesktopMenuLevel('main'), 300);
                                    }, 100);
                                }}
                            >
                                <div className="bg-white/95 dark:bg-[#2a2b2c]/95 backdrop-blur-md text-gray-900 dark:text-white rounded-3xl p-5 w-[380px] shadow-2xl border border-gray-100 dark:border-gray-800">
                                    {desktopMenuLevel === 'main' && (
                                        <>
                                            <div className="mb-4">
                                                <h3 className="text-lg font-semibold mb-1">Outils d'investissement</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Boostez vos analyses</p>
                                            </div>
                                            <div className="space-y-4">
                                                {/* Tools Grid */}
                                                <div className="grid grid-cols-3 gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
                                                    <button
                                                        className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-all"
                                                        onClick={() => setDesktopMenuLevel('chrono')}
                                                    >
                                                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                                            <Image src={mounted && isDark ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono_b.svg" : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono.svg"} alt="Chrono" width={24} height={24} className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[11px] font-semibold">Chrono</span>
                                                    </button>
                                                    <button
                                                        className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-all"
                                                        onClick={() => setDesktopMenuLevel('ranking')}
                                                    >
                                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                                            <Image src={mounted && isDark ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/ranking_b.svg" : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/ranking.svg"} alt="Ranking" width={24} height={24} className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[11px] font-semibold">Ranking</span>
                                                    </button>
                                                    <button
                                                        className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-all"
                                                        onClick={() => { onPortfolioClick?.(); setIsSettingsOpen(false); }}
                                                    >
                                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                                            <Image src={mounted && isDark ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/portfolio_b.svg" : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/portfolio.svg"} alt="Portfolio" width={24} height={24} className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[11px] font-semibold">Portfolio</span>
                                                    </button>
                                                </div>

                                                {/* Existing Settings */}
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl border border-gray-100/50 dark:border-transparent">
                                                        <div className="flex items-center gap-3">
                                                            <Image
                                                                src={mounted && isDark ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/scout_b.svg" : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/scout_n.svg"}
                                                                alt="Market Scout" width={22} height={22} className="w-5 h-5"
                                                            />
                                                            <span className="font-medium text-sm">Market Scout</span>
                                                        </div>
                                                        <button onClick={() => setMarketScoutEnabled(!marketScoutEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${marketScoutEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${marketScoutEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl border border-gray-100/50 dark:border-transparent">
                                                        <div className="flex items-center gap-3">
                                                            <Image
                                                                src={mounted && isDark ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/radar_b.svg" : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/radar_n.svg"}
                                                                alt="Community Radar" width={22} height={22} className="w-5 h-5"
                                                            />
                                                            <span className="font-medium text-sm">Community Radar</span>
                                                        </div>
                                                        <button onClick={() => setCommunityRadarEnabled(!communityRadarEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${communityRadarEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${communityRadarEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {desktopMenuLevel === 'chrono' && (
                                        <>
                                            <div className="mb-4">
                                                <button
                                                    onClick={() => setDesktopMenuLevel('main')}
                                                    className="text-xs text-gray-500 dark:text-gray-400 mb-2 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                                                >
                                                    <ChevronDown className="h-3 w-3 rotate-90" />
                                                    Retour
                                                </button>
                                                <h3 className="text-lg font-semibold mb-1">Investment Flashcards</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Explorez les opportunités</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto px-1">
                                                {Object.keys(FLASHCARD_MAPPING).map((category) => (
                                                    <CategoryButton
                                                        key={category}
                                                        isActive={selectedCategory === category}
                                                        onClick={() => {
                                                            setSelectedCategory(category);
                                                            handleFlashcardClick(category);
                                                            setIsSettingsOpen(false);
                                                        }}
                                                    >
                                                        {category}
                                                    </CategoryButton>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {desktopMenuLevel === 'ranking' && (
                                        <>
                                            <div className="mb-4">
                                                <button
                                                    onClick={() => setDesktopMenuLevel('main')}
                                                    className="text-xs text-gray-500 dark:text-gray-400 mb-2 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                                                >
                                                    <ChevronDown className="h-3 w-3 rotate-90" />
                                                    Retour
                                                </button>
                                                <h3 className="text-lg font-semibold mb-1">Investment Rankings</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Découvrez les leaders</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto px-1">
                                                {Object.keys(FLASHCARD_MAPPING).map((category) => (
                                                    <CategoryButton
                                                        key={category}
                                                        isActive={selectedCategory === category}
                                                        onClick={() => {
                                                            setSelectedCategory(category);
                                                            handleFlashcardClick(category, 'ranking');
                                                            setIsSettingsOpen(false);
                                                        }}
                                                    >
                                                        {category}
                                                    </CategoryButton>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right-side Agent & Mic/Send */}
                    <div className="flex items-center gap-2">
                        {/* Agent Selector (Pro) */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-1.5 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full px-3 py-1.5 transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDropdownOpen(!isDropdownOpen);
                                    setIsFileUploadOpen(false);
                                    setIsSettingsOpen(false);
                                }}
                                onMouseLeave={() => {
                                    if (window.matchMedia('(hover: hover)').matches) {
                                        closeTimeoutRef.current = setTimeout(() => {
                                            setIsDropdownOpen(false);
                                        }, 100);
                                    }
                                }}
                            >
                                <span className="text-sm font-semibold capitalize">{selectedAgent === 'discover' ? 'Standard' : selectedAgent === 'intelligence' ? 'Pro' : 'Oracle'}</span>
                                <ChevronDown className="h-3.5 w-3.5" />
                            </button>

                            {/* Agent Dropdown */}
                            <div
                                className={`
                                hidden sm:block
                                absolute right-0 bottom-full mb-3
                                transition-all duration-300 ease-out
                                z-10
                                ${isDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                            `}
                                onMouseEnter={() => {
                                    if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                    }
                                    setIsDropdownOpen(true);
                                }}
                                onMouseLeave={() => {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsDropdownOpen(false);
                                    }, 100);
                                }}
                            >
                                <div className="bg-white dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-4 w-[320px] shadow-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="space-y-2">
                                        <ModeCard title="DISCOVER" price="Free" description="Explore assets" isActive={selectedAgent === 'discover'} isAvailable={true} onClick={() => handleAgentClick('discover')} />
                                        <ModeCard title="INTELLIGENCE" price="$29.99" description="Predict value" isActive={selectedAgent === 'intelligence'} isAvailable={availableAgents.includes('intelligence')} onClick={() => handleAgentClick('intelligence')} />
                                        <ModeCard title="ORACLE" price="$149.99" description="Lead the market" isActive={selectedAgent === 'oracle'} isAvailable={availableAgents.includes('oracle')} onClick={() => handleAgentClick('oracle')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mic / Send Button */}
                        <div className="flex items-center gap-1">
                            {input.trim() ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSend();
                                    }}
                                    disabled={isLoading}
                                    className="flex items-center justify-center p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all transform active:scale-95"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            ) : (
                                <button
                                    className="flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full p-2 transition-colors"
                                    aria-label="Voice input"
                                >
                                    <Mic className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Sheet - Rendered via Portal */}
            {
                mounted && createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            onClick={() => setIsDropdownOpen(false)}
                        />
                        {/* Bottom Sheet */}
                        <div className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isDropdownOpen ? 'translate-y-0' : 'translate-y-full'
                            }`}>
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-5 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
                                {/* Mode Selection Cards - Mobile */}
                                <ModeCard
                                    title="DISCOVER"
                                    price="Free"
                                    description="Explore assets. Spot trends"
                                    isActive={selectedAgent === 'discover'}
                                    isAvailable={true}
                                    onClick={() => {
                                        handleAgentClick('discover');
                                        setTimeout(() => setIsDropdownOpen(false), 150);
                                    }}
                                    isMobile={true}
                                />
                                <ModeCard
                                    title="INTELLIGENCE"
                                    price="$29.99 / month"
                                    description="Predict value. Invest smarter"
                                    isActive={selectedAgent === 'intelligence'}
                                    isAvailable={availableAgents.includes('intelligence')}
                                    onClick={() => {
                                        handleAgentClick('intelligence');
                                        setTimeout(() => setIsDropdownOpen(false), 150);
                                    }}
                                    isMobile={true}
                                />
                                <ModeCard
                                    title="ORACLE"
                                    price="$149.99 / month"
                                    description="Lead the market. Multiply wealth"
                                    isActive={selectedAgent === 'oracle'}
                                    isAvailable={availableAgents.includes('oracle')}
                                    onClick={() => {
                                        handleAgentClick('oracle');
                                        setTimeout(() => setIsDropdownOpen(false), 150);
                                    }}
                                    isMobile={true}
                                />
                            </div>
                        </div>
                    </>,
                    document.body
                )
            }

            {/* File Upload Modal - Two-level menu for mobile */}
            {
                mounted && createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isFileUploadOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            onClick={() => {
                                setIsFileUploadOpen(false);
                                setMobileMenuLevel('main');
                            }}
                        />
                        {/* Bottom Sheet */}
                        <div className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isFileUploadOpen ? 'translate-y-0' : 'translate-y-full'
                            }`}>
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
                                {mobileMenuLevel === 'main' && (
                                    <>
                                        {/* Main Menu - Flashcards, Ranking, and Portfolio buttons */}
                                        <div className="mb-4">
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Investment Tools</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">Choose your tool</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                className={CARD_BUTTON_STYLES}
                                                onClick={() => setMobileMenuLevel('flashcards')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Image
                                                        src={
                                                            mounted && isDark
                                                                ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono_b.svg"
                                                                : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono.svg"
                                                        }
                                                        alt="Flashcards"
                                                        width={24}
                                                        height={24}
                                                        className="w-6 h-6"
                                                    />
                                                    <span>Investment Flashcards</span>
                                                </div>
                                            </button>
                                            <button
                                                className={CARD_BUTTON_STYLES}
                                                onClick={() => setMobileMenuLevel('ranking')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Image
                                                        src={
                                                            mounted && isDark
                                                                ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/ranking_b.svg"
                                                                : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/ranking.svg"
                                                        }
                                                        alt="Rankings"
                                                        width={24}
                                                        height={24}
                                                        className="w-6 h-6"
                                                    />
                                                    <span>Investment Rankings</span>
                                                </div>
                                            </button>
                                            <button
                                                className={CARD_BUTTON_STYLES}
                                                onClick={() => {
                                                    if (onPortfolioClick) {
                                                        onPortfolioClick();
                                                    }
                                                    setIsFileUploadOpen(false);
                                                    setMobileMenuLevel('main');
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Image
                                                        src={
                                                            mounted && isDark
                                                                ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/portfolio_b.svg"
                                                                : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/portfolio.svg"
                                                        }
                                                        alt="Portfolio"
                                                        width={24}
                                                        height={24}
                                                        className="w-6 h-6"
                                                    />
                                                    <span>Portfolio</span>
                                                </div>
                                            </button>

                                        </div>
                                    </>
                                )}
                                {mobileMenuLevel === 'flashcards' && (
                                    <>
                                        {/* Flashcards submenu */}
                                        <div className="mb-4">
                                            <button
                                                onClick={() => setMobileMenuLevel('main')}
                                                className="text-sm text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                ← Back
                                            </button>
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Investment Flashcards</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">Diversify your portfolio</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <CategoryButton isActive={selectedCategory === 'Contemp. Art'} onClick={() => { setSelectedCategory('Contemp. Art'); handleFlashcardClick('Contemp. Art'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Contemp. Art</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Luxury Bags'} onClick={() => { setSelectedCategory('Luxury Bags'); handleFlashcardClick('Luxury Bags'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Luxury Bags</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Prestigious Wines'} onClick={() => { setSelectedCategory('Prestigious Wines'); handleFlashcardClick('Prestigious Wines'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Prestigious Wines</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Precious Jewelry'} onClick={() => { setSelectedCategory('Precious Jewelry'); handleFlashcardClick('Precious Jewelry'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Precious Jewelry</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Luxury Watch'} onClick={() => { setSelectedCategory('Luxury Watch'); handleFlashcardClick('Luxury Watch'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Luxury Watch</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Collectible Cars'} onClick={() => { setSelectedCategory('Collectible Cars'); handleFlashcardClick('Collectible Cars'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Collectible Cars</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Limited Sneakers'} onClick={() => { setSelectedCategory('Limited Sneakers'); handleFlashcardClick('Limited Sneakers'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Limited Sneakers</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Rare Whiskey'} onClick={() => { setSelectedCategory('Rare Whiskey'); handleFlashcardClick('Rare Whiskey'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Rare Whiskey</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Real Estate'} onClick={() => { setSelectedCategory('Real Estate'); handleFlashcardClick('Real Estate'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Real Estate</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'US sports cards'} onClick={() => { setSelectedCategory('US sports cards'); handleFlashcardClick('US sports cards'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>US sports cards</CategoryButton>
                                        </div>
                                    </>
                                )}
                                {mobileMenuLevel === 'ranking' && (
                                    <>
                                        {/* Rankings submenu */}
                                        <div className="mb-4">
                                            <button
                                                onClick={() => setMobileMenuLevel('main')}
                                                className="text-sm text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                ← Back
                                            </button>
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Investment Rankings</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">Discover market leaders</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <CategoryButton isActive={selectedCategory === 'Contemp. Art'} onClick={() => { setSelectedCategory('Contemp. Art'); handleFlashcardClick('Contemp. Art', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Contemp. Art</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Luxury Bags'} onClick={() => { setSelectedCategory('Luxury Bags'); handleFlashcardClick('Luxury Bags', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Luxury Bags</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Prestigious Wines'} onClick={() => { setSelectedCategory('Prestigious Wines'); handleFlashcardClick('Prestigious Wines', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Prestigious Wines</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Precious Jewelry'} onClick={() => { setSelectedCategory('Precious Jewelry'); handleFlashcardClick('Precious Jewelry', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Precious Jewelry</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Luxury Watch'} onClick={() => { setSelectedCategory('Luxury Watch'); handleFlashcardClick('Luxury Watch', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Luxury Watch</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Collectible Cars'} onClick={() => { setSelectedCategory('Collectible Cars'); handleFlashcardClick('Collectible Cars', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Collectible Cars</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Limited Sneakers'} onClick={() => { setSelectedCategory('Limited Sneakers'); handleFlashcardClick('Limited Sneakers', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Limited Sneakers</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Rare Whiskey'} onClick={() => { setSelectedCategory('Rare Whiskey'); handleFlashcardClick('Rare Whiskey', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Rare Whiskey</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'Real Estate'} onClick={() => { setSelectedCategory('Real Estate'); handleFlashcardClick('Real Estate', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>Real Estate</CategoryButton>
                                            <CategoryButton isActive={selectedCategory === 'US sports cards'} onClick={() => { setSelectedCategory('US sports cards'); handleFlashcardClick('US sports cards', 'ranking'); setIsFileUploadOpen(false); setMobileMenuLevel('main'); }}>US sports cards</CategoryButton>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>,
                    document.body
                )
            }

            {/* Chrono Investment Flashcards Modal - Rendered via Portal */}
            {
                mounted && createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isChronoOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            onClick={() => setIsChronoOpen(false)}
                        />
                        {/* Bottom Sheet */}
                        <div className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isChronoOpen ? 'translate-y-0' : 'translate-y-full'
                            }`}>
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
                                {/* Header */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Investment Flashcards</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">Diversify your portfolio</p>
                                </div>

                                {/* Investment Categories Grid */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <CategoryButton isActive={selectedCategory === 'Contemp. Art'} onClick={() => { setSelectedCategory('Contemp. Art'); handleFlashcardClick('Contemp. Art'); }}>Contemp. Art</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Luxury Bags'} onClick={() => { setSelectedCategory('Luxury Bags'); handleFlashcardClick('Luxury Bags'); }}>Luxury Bags</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Prestigious Wines'} onClick={() => { setSelectedCategory('Prestigious Wines'); handleFlashcardClick('Prestigious Wines'); }}>Prestigious Wines</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Precious Jewelry'} onClick={() => { setSelectedCategory('Precious Jewelry'); handleFlashcardClick('Precious Jewelry'); }}>Precious Jewelry</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Luxury Watch'} onClick={() => { setSelectedCategory('Luxury Watch'); handleFlashcardClick('Luxury Watch'); }}>Luxury Watch</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Collectible Cars'} onClick={() => { setSelectedCategory('Collectible Cars'); handleFlashcardClick('Collectible Cars'); }}>Collectible Cars</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Limited Sneakers'} onClick={() => { setSelectedCategory('Limited Sneakers'); handleFlashcardClick('Limited Sneakers'); }}>Limited Sneakers</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Rare Whiskey'} onClick={() => { setSelectedCategory('Rare Whiskey'); handleFlashcardClick('Rare Whiskey'); }}>Rare Whiskey</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Real Estate'} onClick={() => { setSelectedCategory('Real Estate'); handleFlashcardClick('Real Estate'); }}>Real Estate</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'US sports cards'} onClick={() => { setSelectedCategory('US sports cards'); handleFlashcardClick('US sports cards'); }}>US sports cards</CategoryButton>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )
            }

            {/* Settings Modal - Rendered via Portal */}
            {
                mounted && createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            onClick={() => setIsSettingsOpen(false)}
                        />
                        {/* Bottom Sheet */}
                        <div
                            className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isSettingsOpen ? 'translate-y-0' : 'translate-y-full'
                                }`}
                        >
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent">
                                {/* Header */}
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                                        Settings
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                        Customize your experience
                                    </p>
                                </div>

                                {/* Settings Options */}
                                <div className="space-y-4">
                                    {/* Market Scout Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <Image
                                                src={
                                                    mounted && isDark
                                                        ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/scout_b.svg"
                                                        : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/scout_n.svg"
                                                }
                                                alt="Market Scout"
                                                width={24}
                                                height={24}
                                                className="w-6 h-6"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    Market Scout
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    Les opportunités avant le marché
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setMarketScoutEnabled(!marketScoutEnabled)}
                                            className={`flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${marketScoutEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${marketScoutEnabled ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Community Radar Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <Image
                                                src={
                                                    mounted && isDark
                                                        ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/radar_b.svg"
                                                        : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/icons/radar_n.svg"
                                                }
                                                alt="Community Radar"
                                                width={24}
                                                height={24}
                                                className="w-6 h-6"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    Community Radar
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    Le buzz social en signal d'investissement
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setCommunityRadarEnabled(!communityRadarEnabled)}
                                            className={`flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${communityRadarEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${communityRadarEnabled ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )
            }

            {/* Ranking Modal - Rendered via Portal */}
            {
                mounted && createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isRankingOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            onClick={() => setIsRankingOpen(false)}
                        />
                        {/* Bottom Sheet */}
                        <div className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isRankingOpen ? 'translate-y-0' : 'translate-y-full'
                            }`}>
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent max-h-[70vh] overflow-y-auto">
                                {/* Header */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Investment Rankings</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">Discover market leaders</p>
                                </div>

                                {/* Investment Categories Grid */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <CategoryButton isActive={selectedCategory === 'Contemp. Art'} onClick={() => { setSelectedCategory('Contemp. Art'); handleFlashcardClick('Contemp. Art', 'ranking'); }}>Contemp. Art</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Luxury Bags'} onClick={() => { setSelectedCategory('Luxury Bags'); handleFlashcardClick('Luxury Bags', 'ranking'); }}>Luxury Bags</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Prestigious Wines'} onClick={() => { setSelectedCategory('Prestigious Wines'); handleFlashcardClick('Prestigious Wines', 'ranking'); }}>Prestigious Wines</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Precious Jewelry'} onClick={() => { setSelectedCategory('Precious Jewelry'); handleFlashcardClick('Precious Jewelry', 'ranking'); }}>Precious Jewelry</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Luxury Watch'} onClick={() => { setSelectedCategory('Luxury Watch'); handleFlashcardClick('Luxury Watch', 'ranking'); }}>Luxury Watch</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Collectible Cars'} onClick={() => { setSelectedCategory('Collectible Cars'); handleFlashcardClick('Collectible Cars', 'ranking'); }}>Collectible Cars</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Limited Sneakers'} onClick={() => { setSelectedCategory('Limited Sneakers'); handleFlashcardClick('Limited Sneakers', 'ranking'); }}>Limited Sneakers</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Rare Whiskey'} onClick={() => { setSelectedCategory('Rare Whiskey'); handleFlashcardClick('Rare Whiskey', 'ranking'); }}>Rare Whiskey</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'Real Estate'} onClick={() => { setSelectedCategory('Real Estate'); handleFlashcardClick('Real Estate', 'ranking'); }}>Real Estate</CategoryButton>
                                    <CategoryButton isActive={selectedCategory === 'US sports cards'} onClick={() => { setSelectedCategory('US sports cards'); handleFlashcardClick('US sports cards', 'ranking'); }}>US sports cards</CategoryButton>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )
            }
        </div >
    );
}

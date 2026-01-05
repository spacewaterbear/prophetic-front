"use client";

import { Button } from "@/components/ui/button";
import { Plus, Send, ChevronDown, Paperclip } from "lucide-react";
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
}

export function ChatInput({ input, setInput, handleSend, isLoading, className = "", textareaRef, userStatus = 'discover', selectedAgent = 'discover', onAgentChange, userId, conversationId, attachedFiles = [], onFilesChange }: ChatInputProps) {
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
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            className={`relative flex flex-col w-full max-w-3xl mx-auto bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-[24px] p-4 shadow-sm transition-colors ${className}`}
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
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <button
                            className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full p-2.5 transition-colors"
                            aria-label="Add file"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsFileUploadOpen(!isFileUploadOpen);
                                setIsDropdownOpen(false);
                            }}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only auto-open on hover for desktop (non-touch devices)
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsFileUploadOpen(true);
                                    setIsDropdownOpen(false);
                                    setIsChronoOpen(false);
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsFileUploadOpen(false);
                                    }, 100);
                                }
                            }}
                        >
                            <Plus className="h-5 w-5" />
                        </button>

                        {/* Desktop Dropdown */}
                        <div
                            className={`
                                hidden sm:block
                                absolute left-1/2 bottom-full -translate-x-1/2 mb-2
                                transition-all duration-300 ease-out
                                z-10
                                ${isFileUploadOpen
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none'
                                }
                            `}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only keep open on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsFileUploadOpen(true);
                                    setIsDropdownOpen(false);
                                    setIsChronoOpen(false);
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsFileUploadOpen(false);
                                    }, 100);
                                }
                            }}
                        >
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[320px] shadow-2xl border dark:border-transparent">
                                {/* Add Files Option */}
                                <div
                                    className="m-0 p-3 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl opacity-60 cursor-not-allowed flex items-center gap-3 relative"
                                >
                                    <Paperclip className="h-6 w-6 text-gray-900 dark:text-white" />
                                    <div className="flex flex-col flex-1">
                                        <span className="text-gray-900 dark:text-white font-medium text-base">Ajouter fichiers</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Coming soon</span>
                                    </div>
                                </div>

                                {/* Google Drive option removed - will be implemented later */}
                            </div>
                        </div>
                    </div>


                    {/* Prophetic Logo Button */}
                    <div className="static sm:relative flex-shrink-0">
                        <button
                            type="button"
                            data-dashlane-ignore="true"
                            className="flex items-center gap-2 bg-[#352ee8] hover:bg-[#2920c7] rounded-full px-3 py-2 transition-colors cursor-pointer max-w-[200px] sm:max-w-none"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // Prevent parent onClick from focusing textarea
                                setIsDropdownOpen(!isDropdownOpen);
                                setIsFileUploadOpen(false);
                            }}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only auto-open on hover for desktop (non-touch devices)
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsDropdownOpen(true);
                                    setIsFileUploadOpen(false);
                                    setIsChronoOpen(false);
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
                            <span className="text-white font-medium text-sm capitalize truncate whitespace-nowrap">{selectedAgent} mode</span>
                            <ChevronDown className="h-4 w-4 text-white" />
                        </button>

                        {/* Subscription Tiers Dropdown/Bottom Sheet */}

                        {/* Desktop Dropdown */}
                        <div
                            className={`
                                hidden sm:block
                                absolute left-1/2 bottom-full -translate-x-1/2 mb-2
                                transition-all duration-300 ease-out
                                z-10
                                ${isDropdownOpen
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none'
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
                                    setIsFileUploadOpen(false);
                                    setIsChronoOpen(false);
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
                                            <span className="text-gray-900 dark:text-white font-semibold text-base">DISCOVER - Free</span>
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
                                            <span className="text-gray-900 dark:text-white font-semibold text-base">INTELLIGENCE - $29.99 / month</span>
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
                                            <span className="text-gray-900 dark:text-white font-semibold text-base">ORACLE - $149.99 / month</span>
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

                    {/* Chrono Button */}
                    <div className="static sm:relative flex-shrink-0">
                        <button
                            className="flex items-center justify-center text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full px-1 py-2.5 transition-colors"
                            aria-label="Chrono"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsChronoOpen(!isChronoOpen);
                                setIsDropdownOpen(false);
                                setIsFileUploadOpen(false);
                            }}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only auto-open on hover for desktop (non-touch devices)
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsChronoOpen(true);
                                    setIsDropdownOpen(false);
                                    setIsFileUploadOpen(false);
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsChronoOpen(false);
                                    }, 100);
                                }
                            }}
                        >
                            <Image
                                src={
                                    mounted && isDark
                                        ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono_b.svg"
                                        : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/chrono.svg"
                                }
                                alt="Chrono"
                                width={24}
                                height={24}
                                className="w-9 h-9"
                            />
                        </button>

                        {/* Desktop Dropdown */}
                        <div
                            className={`
                                hidden sm:block
                                absolute left-1/2 bottom-full -translate-x-1/2 mb-2
                                transition-all duration-300 ease-out
                                z-10
                                ${isChronoOpen
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none'
                                }
                            `}
                            onMouseEnter={() => {
                                if (closeTimeoutRef.current) {
                                    clearTimeout(closeTimeoutRef.current);
                                    closeTimeoutRef.current = null;
                                }
                                // Only keep open on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    setIsChronoOpen(true);
                                    setIsDropdownOpen(false);
                                    setIsFileUploadOpen(false);
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.matchMedia('(hover: hover)').matches) {
                                    closeTimeoutRef.current = setTimeout(() => {
                                        setIsChronoOpen(false);
                                    }, 100);
                                }
                            }}
                        >
                            <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[420px] shadow-2xl border dark:border-transparent">
                                {/* Header */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Investment Flashcards</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">Diversify your portfolio</p>
                                </div>

                                {/* Investment Categories Grid */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Contemporary Art
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Luxury Bags
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Prestigious Wines
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Precious Jewelry
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Luxury Watch
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Collectible Cars
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Limited Sneakers
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Rare Whiskey
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        Real Estate
                                    </button>
                                </div>

                                {/* Additional Categories */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        US sports cards
                                    </button>
                                    <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                        All Segments
                                    </button>
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

            {/* Mobile Bottom Sheet - Rendered via Portal */}
            {mounted && createPortal(
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
                            {/* Discover Agent */}
                            <div
                                className={`mb-4 p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl active:scale-95 active:brightness-95 transition-all duration-150 cursor-pointer ${selectedAgent === 'discover' ? 'ring-2 ring-blue-500' : ''}`}
                                onClick={(e) => {
                                    const element = e.currentTarget;
                                    element.style.transform = 'scale(0.95)';
                                    setTimeout(() => {
                                        element.style.transform = '';
                                        handleAgentClick('discover');
                                        setTimeout(() => setIsDropdownOpen(false), 150);
                                    }, 100);
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-900 dark:text-white font-semibold text-base">DISCOVER - Free</span>
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
                                className={`mb-4 p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl active:scale-95 active:brightness-95 transition-all duration-150 ${availableAgents.includes('intelligence') ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'} ${selectedAgent === 'intelligence' ? 'ring-2 ring-blue-500' : ''}`}
                                onClick={(e) => {
                                    if (availableAgents.includes('intelligence')) {
                                        const element = e.currentTarget;
                                        element.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                            element.style.transform = '';
                                            handleAgentClick('intelligence');
                                            setTimeout(() => setIsDropdownOpen(false), 150);
                                        }, 100);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-900 dark:text-white font-semibold text-base">INTELLIGENCE - $29.99 / month</span>
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
                                className={`p-4 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl active:scale-95 active:brightness-95 transition-all duration-150 ${availableAgents.includes('oracle') ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'} ${selectedAgent === 'oracle' ? 'ring-2 ring-blue-500' : ''}`}
                                onClick={(e) => {
                                    if (availableAgents.includes('oracle')) {
                                        const element = e.currentTarget;
                                        element.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                            element.style.transform = '';
                                            handleAgentClick('oracle');
                                            setTimeout(() => setIsDropdownOpen(false), 150);
                                        }, 100);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-900 dark:text-white font-semibold text-base">ORACLE - $149.99 / month</span>
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
                </>,
                document.body
            )}

            {/* File Upload Modal - Rendered via Portal */}
            {mounted && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className={`sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isFileUploadOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                        onClick={() => setIsFileUploadOpen(false)}
                    />
                    {/* Bottom Sheet */}
                    <div className={`sm:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isFileUploadOpen ? 'translate-y-0' : 'translate-y-full'
                        }`}>
                        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-t-3xl p-6 w-full shadow-2xl border-t border-gray-200 dark:border-transparent">
                            {/* Add Files Option */}
                            <div
                                className="mb-4 p-3 bg-[#f0e7dd] dark:bg-[#1e1f20] rounded-2xl opacity-60 cursor-not-allowed flex items-center gap-3"
                            >
                                <Paperclip className="h-6 w-6 text-gray-900 dark:text-white" />
                                <div className="flex flex-col flex-1">
                                    <span className="text-gray-900 dark:text-white font-medium text-base">Ajouter fichiers</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Coming soon</span>
                                </div>
                            </div>

                            {/* Google Drive option removed - will be implemented later */}
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Chrono Investment Flashcards Modal - Rendered via Portal */}
            {mounted && createPortal(
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
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Contemp. Art
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Luxury Bags
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Prestigious Wines
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Precious Jewelry
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Luxury Watch
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Collectible Cars
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Limited Sneakers
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Rare Whiskey
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    Real Estate
                                </button>
                            </div>

                            {/* Additional Categories */}
                            <div className="grid grid-cols-2 gap-2">
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    US sports cards
                                </button>
                                <button className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                                    All Segments
                                </button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

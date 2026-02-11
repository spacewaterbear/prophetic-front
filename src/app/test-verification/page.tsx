"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { memo, useState, Suspense } from "react";

// Mock interfaces
interface Artist {
    artist_name: string;
    artist_picture_url: string | null;
    primary_country: string | null;
    country_iso_code: string | null;
    total_artworks: number | null;
}

interface Message {
    id: number;
    content: string;
    sender: "user" | "ai";
    created_at: string;
    type?: string;
    message?: string;
    research_type?: string;
    artist?: Artist;
    has_existing_data?: boolean;
    text?: string;
    streaming_text?: string;
}

// Copied AIAvatar with the fix
const AIAvatar = memo(() => (
    <div
        className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 items-center justify-center flex-shrink-0 overflow-hidden">
        <Image
            src="https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
            alt="Prophetic Orchestra"
            width={40}
            height={40}
            className="w-full h-full object-cover"
            priority
        />
    </div>
));
AIAvatar.displayName = "AIAvatar";

// Copied MessageItem with the fix
const MessageItem = memo(({ message, userName }: { message: Message; userName: string }) => {
    const [copied, setCopied] = useState(false);

    return (
        <div
            className={`flex gap-2 sm:gap-4 items-start ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
            {message.sender === "ai" && <AIAvatar />}
            <div className="group relative">
                <div
                    className={`max-w-[90vw] sm:max-w-3xl lg:max-w-4xl pl-4 pr-12 py-4 sm:pl-8 sm:pr-14 sm:py-5 rounded-2xl ${message.sender === "user"
                        ? "bg-custom-brand text-white"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                        }`}
                >
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
            {message.sender === "user" && (
                <div
                    className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-custom-brand items-center justify-center text-white font-medium flex-shrink-0 leading-none text-base sm:text-lg">
                    {userName}
                </div>
            )}
        </div>
    );
});
MessageItem.displayName = "MessageItem";

import { ArtistCard } from "@/components/ArtistCard";

export default function TestPage() {
    const artistWithMissingData = {
        artist_name: "Jean-Michel Basquiat",
        artist_picture_url: null,
        primary_country: null,
        country_iso_code: null,
        total_artworks: null,
        ratio_sold: undefined,
        social_score: undefined
    };

    return (
        <div className="p-4 space-y-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-4 dark:text-white">Artist Card Verification</h1>

            <div className="max-w-3xl mx-auto space-y-8">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                    <h2 className="mb-4 font-semibold dark:text-white">Scenario: Missing Image & Stats</h2>
                    <ArtistCard
                        artist={artistWithMissingData}
                        researchType="MARKET_ANALYSIS"
                        message="Here is the market analysis for Jean-Michel Basquiat."
                    />
                </div>
            </div>
        </div>
    );
}

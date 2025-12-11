"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, Language, getTranslation } from "@/lib/translations";

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("fr");

    // Fetch user's geolocation and set language on mount
    useEffect(() => {
        const fetchGeolocation = async () => {
            try {
                const response = await fetch("/api/geolocation");
                if (response.ok) {
                    const data = await response.json();
                    const detectedLang = data.language || "fr";
                    setLanguage(detectedLang as Language);
                    console.log("[I18n] Language detected:", detectedLang, "from country:", data.country);
                }
            } catch (error) {
                console.error("[I18n] Error fetching geolocation:", error);
                // Keep default French on error
            }
        };

        fetchGeolocation();
    }, []);

    // Translation function
    const t = (key: string): string => {
        return getTranslation(language, key);
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

// Custom hook to use i18n context
export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
}

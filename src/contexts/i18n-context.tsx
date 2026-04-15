"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations, Language, getTranslation } from "@/lib/translations";
import { api, type GeolocationResponse } from "@/lib/api";

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const GEO_CACHE_KEY = "i18n_geolocation_language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("fr");

    // Fetch user's geolocation and set language on mount, with session-duration cache
    useEffect(() => {
        const cached = sessionStorage.getItem(GEO_CACHE_KEY);
        if (cached) {
            setLanguage(cached as Language);
            return;
        }

        const fetchGeolocation = async () => {
            try {
                const data = await api.get<GeolocationResponse>("/api/geolocation");
                const detectedLang = data.language || "fr";
                setLanguage(detectedLang as Language);
                sessionStorage.setItem(GEO_CACHE_KEY, detectedLang);
            } catch (error) {
                console.error("[I18n] Error fetching geolocation:", error);
                // Keep default French on error
            }
        };

        fetchGeolocation();
    }, []);

    // Translation function
    const t = useCallback((key: string): string => {
        return getTranslation(language, key);
    }, [language]);

    const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

    return (
        <I18nContext.Provider value={value}>
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

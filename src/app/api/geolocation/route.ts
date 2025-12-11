import { NextRequest, NextResponse } from "next/server";

// Map countries to language codes
const countryToLanguage: Record<string, string> = {
    FR: "fr",
    BE: "fr", // Belgium - French/Dutch, defaulting to French
    CH: "fr", // Switzerland - French/German/Italian, defaulting to French
    CA: "fr", // Canada - English/French, defaulting to French
    US: "en",
    GB: "en",
    AU: "en",
    NZ: "en",
    IE: "en",
    ES: "es",
    MX: "es",
    AR: "es",
    CO: "es",
    CL: "es",
    PE: "es",
    DE: "de",
    AT: "de",
    IT: "it",
    PT: "pt",
    BR: "pt",
    NL: "nl",
    JP: "ja",
    CN: "zh",
    TW: "zh",
    HK: "zh",
};

export async function GET(request: NextRequest) {
    try {
        // Get the client's IP address
        const forwarded = request.headers.get("x-forwarded-for");
        const realIp = request.headers.get("x-real-ip");
        const ip = forwarded?.split(",")[0] || realIp || "unknown";

        // For localhost/development, default to French
        if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
            return NextResponse.json({
                country: "FR",
                language: "fr",
                ip: ip,
                source: "default",
            });
        }

        // Use ipapi.co to get geolocation data (free tier, no API key needed)
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
            headers: {
                "User-Agent": "prophetic-front/1.0",
            },
        });

        if (!geoResponse.ok) {
            throw new Error("Geolocation API failed");
        }

        const geoData = await geoResponse.json();

        // Get country code and map to language
        const countryCode = geoData.country_code || "FR";
        const language = countryToLanguage[countryCode] || "en";

        return NextResponse.json({
            country: countryCode,
            language: language,
            ip: ip,
            source: "ipapi",
        });
    } catch (error) {
        console.error("Error detecting geolocation:", error);
        // Default to French on error
        return NextResponse.json({
            country: "FR",
            language: "fr",
            ip: "unknown",
            source: "error_fallback",
        });
    }
}

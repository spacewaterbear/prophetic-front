import { NextRequest, NextResponse } from "next/server";

// In-memory cache for vignettes data
const vignetteCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// GET /api/vignettes?category=ART
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const category = searchParams.get("category");

        if (!category) {
            return NextResponse.json(
                { detail: "Category parameter is required" },
                { status: 400 }
            );
        }

        const speciality = process.env.NEXT_PUBLIC_SPECIALITY || "main";
        const lang = searchParams.get("lang") || "fr";
        const cacheKey = `${speciality}:${category.toUpperCase()}:${lang}`;

        // Check cache first
        const cached = vignetteCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return NextResponse.json(cached.data);
        }

        if (!process.env.PROPHETIC_API_URL) {
            console.error("[Vignettes API] PROPHETIC_API_URL not configured");
            return NextResponse.json(
                { detail: "API URL not configured" },
                { status: 500 }
            );
        }

        if (!process.env.INTERNAL_API_KEY) {
            console.error("[Vignettes API] INTERNAL_API_KEY not configured");
            return NextResponse.json(
                { detail: "API key not configured" },
                { status: 500 }
            );
        }

        const specialityParam = speciality === "art" ? "is_art=true" : "is_main=true";
        const apiUrl = `${process.env.PROPHETIC_API_URL}/prophetic/vignettes?category=${category}&${specialityParam}`;
        console.log(`[Vignettes API] Fetching from:`, apiUrl);

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "x-api-key": process.env.INTERNAL_API_KEY,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.error(`[Vignettes API] Backend error: ${response.status}`);
            const errorText = await response.text();
            console.error(`[Vignettes API] Error details:`, errorText);
            return NextResponse.json(
                { detail: "Failed to fetch vignettes from backend" },
                { status: response.status }
            );
        }

        const data = await response.json();

        vignetteCache.set(cacheKey, { data, timestamp: Date.now() });
        return NextResponse.json(data);
    } catch (error) {
        console.error("[Vignettes API] Error:", error);
        return NextResponse.json(
            { detail: "Internal server error" },
            { status: 500 }
        );
    }
}

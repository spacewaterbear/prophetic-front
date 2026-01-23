import { NextRequest, NextResponse } from "next/server";

// In-memory cache for vignettes data
const vignetteCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// GET /api/vignettes?category=WINE
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const category = searchParams.get("category");

        if (!category) {
            return NextResponse.json(
                { error: "Category parameter is required" },
                { status: 400 }
            );
        }

        // Check cache first
        const cacheKey = category.toUpperCase();
        const cached = vignetteCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[Vignettes API] Cache HIT for category: ${cacheKey}`);
            return NextResponse.json(cached.data);
        }

        if (!process.env.PROPHETIC_API_URL) {
            console.error("[Vignettes API] PROPHETIC_API_URL not configured");
            return NextResponse.json(
                { error: "API URL not configured" },
                { status: 500 }
            );
        }

        if (!process.env.PROPHETIC_API_TOKEN) {
            console.error("[Vignettes API] PROPHETIC_API_TOKEN not configured");
            return NextResponse.json(
                { error: "API token not configured" },
                { status: 500 }
            );
        }

        const apiUrl = `${process.env.PROPHETIC_API_URL}/prophetic/vignettes?category=${category}`;
        console.log(`[Vignettes API] Fetching from:`, apiUrl);

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.PROPHETIC_API_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.error(`[Vignettes API] Backend error: ${response.status}`);
            const errorText = await response.text();
            console.error(`[Vignettes API] Error details:`, errorText);
            return NextResponse.json(
                { error: "Failed to fetch vignettes from backend" },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[Vignettes API] Successfully fetched ${data.vignettes?.length || 0} vignettes for ${cacheKey}`);

        // Store in cache
        vignetteCache.set(cacheKey, { data, timestamp: Date.now() });
        console.log(`[Vignettes API] Cached data for category: ${cacheKey}`);

        return NextResponse.json(data);
    } catch (error) {
        console.error("[Vignettes API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

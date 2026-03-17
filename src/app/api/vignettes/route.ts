import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
                { error: "Category parameter is required" },
                { status: 400 }
            );
        }

        const speciality = process.env.NEXT_PUBLIC_SPECIALITY || "main";
        const cacheKey = `${speciality}:${category.toUpperCase()}`;

        // Check cache first
        const cached = vignetteCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
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

        const specialityParam = speciality === "art" ? "is_art=true" : "is_main=true";
        const apiUrl = `${process.env.PROPHETIC_API_URL}/prophetic/vignettes?category=${category}&${specialityParam}`;
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

        // Enrich with primary_country from Supabase vignettes_staging
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });
                const { data: stagingRows } = await supabase
                    .from("vignettes_staging")
                    .select("brand_name, primary_country")
                    .eq("category", category.toUpperCase())
                    .not("primary_country", "is", null);

                if (stagingRows && stagingRows.length > 0) {
                    const countryMap = new Map(
                        stagingRows.map((r: { brand_name: string; primary_country: string }) => [r.brand_name, r.primary_country])
                    );
                    const vignettes = Array.isArray(data) ? data : data.vignettes;
                    if (Array.isArray(vignettes)) {
                        for (const v of vignettes) {
                            if (countryMap.has(v.brand_name)) {
                                v.primary_country = countryMap.get(v.brand_name);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[Vignettes API] Failed to enrich with countries:", err);
            }
        }

        // Override with hardcoded items for CASH_FLOW_LEASING
        if (category.toUpperCase() === "CASH_FLOW_LEASING") {
            const hardcodedItems = [
                { category: "CASH_FLOW_LEASING", brand_name: "Vestiaire Collective", subtitle: "2 millions de produits", public_url: "vestiare_collective_leasing.md", nb_insights: 0 },
                { category: "CASH_FLOW_LEASING", brand_name: "Farfetch", subtitle: "100 000 de produits", public_url: "farfetech_leasing.md", nb_insights: 0 },
                { category: "CASH_FLOW_LEASING", brand_name: "Rebag", subtitle: "30 000 de produits", public_url: "rebag_leasing.md", nb_insights: 0 },
            ];
            const mergedData = Array.isArray(data) ? hardcodedItems : { ...data, vignettes: hardcodedItems };
            vignetteCache.set(cacheKey, { data: mergedData, timestamp: Date.now() });
            return NextResponse.json(mergedData);
        }

        vignetteCache.set(cacheKey, { data, timestamp: Date.now() });
        return NextResponse.json(data);
    } catch (error) {
        console.error("[Vignettes API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

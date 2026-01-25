import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/markdown - Unified proxy for all Prophetic Markdown endpoints
 * 
 * Query parameters:
 * - type: 'independant' | 'dependant-without-sub' | 'dependant-with-sub' (Required)
 * - tiers_level: 'DISCOVER' | 'INTELLIGENCE' | 'ORACLE' (Default: 'DISCOVER' for dependant types)
 * - category: Category name (For dependant types)
 * - sub_category: Sub-category name (For dependant-with-sub type)
 * - root_folder: 'ART_TRADING_VALUE' | 'VIGNETTES' (For independant type)
 * - markdown_name: Filename without extension (For independant and dependant-without-sub types)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get("type");

        if (!process.env.PROPHETIC_API_URL || !process.env.PROPHETIC_API_TOKEN) {
            console.error("[Markdown Proxy] API configuration missing: PROPHETIC_API_URL or PROPHETIC_API_TOKEN");
            return NextResponse.json(
                { error: "API configuration missing" },
                { status: 500 }
            );
        }

        if (!type) {
            return NextResponse.json(
                { error: "Markdown type (independant, dependant-without-sub, dependant-with-sub) is required" },
                { status: 400 }
            );
        }

        let backendPath = "";
        const query = new URLSearchParams(searchParams);
        query.delete("type");

        // Add default tiers_level if not present and if it's a tiers-dependent type
        if (type.startsWith("dependant") && !query.has("tiers_level")) {
            query.set("tiers_level", "DISCOVER");
        }

        switch (type) {
            case "independant":
                backendPath = "/prophetic/markdown/tiers-independant";
                break;
            case "dependant-without-sub":
                backendPath = "/prophetic/markdown/tiers-dependant/without-sub-category";
                break;
            case "dependant-with-sub":
                backendPath = "/prophetic/markdown/tiers-dependant/with-sub-category";
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid markdown type" },
                    { status: 400 }
                );
        }

        // Use the base URL from env and append the specific backend path
        // PROPHETIC_API_URL is expected to be something like "http://backend:8000/api/v2"
        const apiUrl = `${process.env.PROPHETIC_API_URL}${backendPath}?${query.toString()}`;
        console.log(`[Markdown Proxy] Forwarding to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.PROPHETIC_API_TOKEN}`,
                "Accept": "text/event-stream",
            },
        });

        if (!response.ok) {
            console.error(`[Markdown Proxy] Backend error: ${response.status}`);
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json(errorJson, { status: response.status });
            } catch {
                return NextResponse.json({ error: errorText || "Failed to fetch content" }, { status: response.status });
            }
        }

        // Check if the response is an SSE stream or JSON
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("text/event-stream")) {
            // Forward the SSE stream
            return new Response(response.body, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            });
        } else {
            // Forward standard JSON or text response
            const body = await response.text();
            return new Response(body, {
                headers: {
                    "Content-Type": contentType || "application/json",
                },
            });
        }
    } catch (error) {
        console.error("[Markdown Proxy] Controller error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";

// GET /api/vignettes/markdown?markdown=image_name
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const markdown = searchParams.get("markdown");

        if (!markdown) {
            return NextResponse.json(
                { error: "Markdown parameter is required" },
                { status: 400 }
            );
        }

        if (!process.env.PROPHETIC_API_URL) {
            console.error("[Vignettes Markdown API] PROPHETIC_API_URL not configured");
            return NextResponse.json(
                { error: "API URL not configured" },
                { status: 500 }
            );
        }

        if (!process.env.PROPHETIC_API_TOKEN) {
            console.error("[Vignettes Markdown API] PROPHETIC_API_TOKEN not configured");
            return NextResponse.json(
                { error: "API token not configured" },
                { status: 500 }
            );
        }

        const apiUrl = `${process.env.PROPHETIC_API_URL}/prophetic/vignettes/markdown?markdown=${encodeURIComponent(markdown)}`;
        console.log(`[Vignettes Markdown API] Fetching from:`, apiUrl);

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.PROPHETIC_API_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.error(`[Vignettes Markdown API] Backend error: ${response.status}`);
            const errorText = await response.text();
            console.error(`[Vignettes Markdown API] Error details:`, errorText);
            return NextResponse.json(
                { error: "Failed to fetch markdown from backend" },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[Vignettes Markdown API] Successfully fetched markdown`);

        return NextResponse.json(data);
    } catch (error) {
        console.error("[Vignettes Markdown API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

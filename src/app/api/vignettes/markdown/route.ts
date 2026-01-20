import { NextRequest, NextResponse } from "next/server";

// GET /api/vignettes/markdown?markdown=image_name
// The backend returns SSE stream with events: document, questions_chunk, done
// This route forwards the SSE stream to the client for progressive display
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
                "Accept": "text/event-stream",
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

        // Forward the SSE stream directly to the client for progressive display
        const reader = response.body?.getReader();
        if (!reader) {
            return NextResponse.json(
                { error: "No response body" },
                { status: 500 }
            );
        }

        // Create a ReadableStream to forward the SSE events
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.close();
                            break;
                        }

                        // Forward the raw SSE data directly
                        controller.enqueue(value);
                    }
                } catch (error) {
                    console.error("[Vignettes Markdown API] Stream error:", error);
                    controller.error(error);
                }
            },
        });

        console.log(`[Vignettes Markdown API] Forwarding SSE stream to client`);

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error) {
        console.error("[Vignettes Markdown API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

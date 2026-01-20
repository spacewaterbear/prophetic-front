import { NextRequest, NextResponse } from "next/server";

// GET /api/vignettes/markdown?markdown=image_name
// The backend returns SSE stream with events: document, questions_chunk, done
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

        // Parse SSE stream from backend
        // Events: document (full markdown), questions_chunk (streamed), done
        const reader = response.body?.getReader();
        if (!reader) {
            return NextResponse.json(
                { error: "No response body" },
                { status: 500 }
            );
        }

        const decoder = new TextDecoder();
        let documentContent = "";
        let questionsContent = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split by double newline to get complete SSE events
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const event of events) {
                if (!event.trim()) continue;

                // Extract data from SSE event
                const lines = event.split("\n");
                let eventData = "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        eventData += line.slice(6);
                    }
                }

                if (!eventData || eventData === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(eventData);

                    if (parsed.type === "document") {
                        documentContent = parsed.content || "";
                        console.log(`[Vignettes Markdown API] Received document (${documentContent.length} chars)`);
                    } else if (parsed.type === "status") {
                        console.log(`[Vignettes Markdown API] Status: ${parsed.message}`);
                    } else if (parsed.type === "questions_chunk") {
                        questionsContent += parsed.content || "";
                    } else if (parsed.type === "done") {
                        console.log(`[Vignettes Markdown API] Stream complete`);
                    }
                } catch (parseError) {
                    console.error("[Vignettes Markdown API] Failed to parse SSE event:", eventData);
                }
            }
        }

        // Combine document and questions into final text
        const fullText = questionsContent
            ? `${documentContent}\n\n${questionsContent}`
            : documentContent;

        console.log(`[Vignettes Markdown API] Successfully fetched markdown (${fullText.length} chars total)`);

        return NextResponse.json({ text: fullText });
    } catch (error) {
        console.error("[Vignettes Markdown API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

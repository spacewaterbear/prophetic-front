import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
        // Validate URL
        const parsedUrl = new URL(url);

        // Fetch the webpage with better headers to avoid being blocked
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            },
            // Add timeout
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            // Return minimal data instead of error for better UX
            return NextResponse.json({
                title: parsedUrl.hostname,
                url,
                siteName: parsedUrl.hostname,
                favicon: `${parsedUrl.origin}/favicon.ico`,
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract Open Graph and meta tags
        const getMetaContent = (property: string): string | undefined => {
            return (
                $(`meta[property="${property}"]`).attr("content") ||
                $(`meta[name="${property}"]`).attr("content") ||
                undefined
            );
        };

        const title =
            getMetaContent("og:title") ||
            getMetaContent("twitter:title") ||
            $("title").text() ||
            parsedUrl.hostname;

        const description =
            getMetaContent("og:description") ||
            getMetaContent("twitter:description") ||
            getMetaContent("description") ||
            undefined;

        let image =
            getMetaContent("og:image") ||
            getMetaContent("twitter:image") ||
            undefined;

        // Make image URL absolute if it's relative
        if (image && !image.startsWith("http")) {
            try {
                image = new URL(image, parsedUrl.origin).href;
            } catch {
                image = undefined;
            }
        }

        const siteName = getMetaContent("og:site_name") || parsedUrl.hostname;

        // Try to get favicon
        let favicon =
            $('link[rel="icon"]').attr("href") ||
            $('link[rel="shortcut icon"]').attr("href") ||
            $('link[rel="apple-touch-icon"]').attr("href") ||
            undefined;

        if (favicon && !favicon.startsWith("http")) {
            try {
                favicon = new URL(favicon, parsedUrl.origin).href;
            } catch {
                favicon = `${parsedUrl.origin}/favicon.ico`;
            }
        } else if (!favicon) {
            // Default favicon location
            favicon = `${parsedUrl.origin}/favicon.ico`;
        }

        return NextResponse.json({
            title,
            description,
            image,
            url,
            siteName,
            favicon,
        });
    } catch (error) {
        // Return minimal fallback data instead of error
        try {
            const parsedUrl = new URL(url);
            return NextResponse.json({
                title: parsedUrl.hostname,
                url,
                siteName: parsedUrl.hostname,
                favicon: `${parsedUrl.origin}/favicon.ico`,
            });
        } catch {
            return NextResponse.json(
                { error: "Failed to generate preview" },
                { status: 500 }
            );
        }
    }
}

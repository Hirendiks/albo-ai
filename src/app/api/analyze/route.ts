import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";
import { analyzeContentWithAI } from "@/lib/ai";
import { AnalyzedLink } from "@/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      categoryId = "cat-tech",
      apiKey,
      notes,
      onScreenNotes,
      screenshotImage,
    } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid URL is required." },
        { status: 400 }
      );
    }

    const combinedNotes = [onScreenNotes, notes].filter(Boolean).join("\n\n");

    // Step 1: Scrape Webpage metadata, full description, contact info, and screenshot
    const scrapedData = await scrapeUrl(url, combinedNotes, screenshotImage);

    // Step 2: Run AI or Heuristic Analysis (with Multimodal Vision if screenshot/image available)
    const aiSummary = await analyzeContentWithAI(scrapedData, apiKey);

    // Step 3: Construct AnalyzedLink record
    const newLink: AnalyzedLink = {
      id: "link-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      url: scrapedData.url,
      title: scrapedData.title || "Untitled Resource",
      description: scrapedData.description || aiSummary.tldr,
      image: scrapedData.image,
      favicon: scrapedData.favicon,
      siteName: scrapedData.siteName,
      author: scrapedData.author,
      publishedDate: scrapedData.publishedDate,
      categoryId,
      notes: notes || undefined,
      isFavorite: false,
      isPinned: false,
      aiSummary,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      link: newLink,
    });
  } catch (error: any) {
    console.error("API /api/analyze error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to analyze link.",
      },
      { status: 500 }
    );
  }
}

import * as cheerio from "cheerio";
import { ScrapedData } from "@/types";

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

export function extractRegexContacts(text: string): {
  phoneNumbers: string[];
  emails: string[];
  links: string[];
} {
  if (!text) return { phoneNumbers: [], emails: [], links: [] };

  // 1. Email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g;
  const rawEmails = text.match(emailRegex) || [];
  const emails = Array.from(new Set(rawEmails.map((e) => e.toLowerCase())));

  // 2. Phone number extraction (handles +91, +1, UK, 10-digit mobile, brackets, dashes, spaces)
  const phoneRegex = /(?:(?:\+|00)\d{1,4}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{3,5}(?:[-.\s]*\d{1,5})?/g;
  const rawPhones = text.match(phoneRegex) || [];
  const validPhones = Array.from(
    new Set(
      rawPhones
        .map((p) => p.trim())
        .filter((p) => {
          const digits = p.replace(/\D/g, "");
          // Valid phone numbers are usually between 8 and 15 digits
          // Filter out typical false positives like timestamps or years (e.g. 2024, 2025)
          const isYear = /^202[0-9]/.test(digits) && digits.length <= 8;
          return digits.length >= 8 && digits.length <= 15 && !isYear;
        })
    )
  ).slice(0, 6);

  // 3. URLs and social links
  const urlRegex = /https?:\/\/[^\s<>"]+/g;
  const rawUrls = text.match(urlRegex) || [];
  const links = Array.from(
    new Set(rawUrls.map((u) => u.replace(/[.,;)]+$/, "")))
  ).slice(0, 8);

  return {
    phoneNumbers: validPhones,
    emails,
    links,
  };
}

export async function scrapeUrl(
  rawUrl: string,
  onScreenNotes?: string
): Promise<ScrapedData> {
  const url = normalizeUrl(rawUrl);
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  // Default fallback favicon using Google's reliable high-res favicon service
  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // Check for YouTube
  const isYouTube = domain.includes("youtube.com") || domain.includes("youtu.be");
  let youtubeVideoId: string | null = null;
  let oembedData: { title?: string; author_name?: string; thumbnail_url?: string } | null = null;
  let youtubeFullDescription = "";

  if (isYouTube) {
    if (domain.includes("youtu.be")) {
      youtubeVideoId = parsedUrl.pathname.slice(1);
    } else {
      youtubeVideoId = parsedUrl.searchParams.get("v");
    }

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch {
      // Ignore oembed timeout
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AlboBot/1.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const html = await response.text();

    // YouTube in-depth player response parser: extracts full description & creator contacts
    if (isYouTube) {
      try {
        const startStr = "ytInitialPlayerResponse = ";
        const startIdx = html.indexOf(startStr);
        if (startIdx !== -1) {
          let braceCount = 0;
          let endIdx = -1;
          for (let i = startIdx + startStr.length; i < html.length; i++) {
            if (html[i] === "{") braceCount++;
            else if (html[i] === "}") {
              braceCount--;
              if (braceCount === 0) {
                endIdx = i + 1;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            const playerObj = JSON.parse(html.substring(startIdx + startStr.length, endIdx));
            youtubeFullDescription = playerObj.videoDetails?.shortDescription || "";
            if (!oembedData?.title && playerObj.videoDetails?.title) {
              oembedData = { ...oembedData, title: playerObj.videoDetails.title };
            }
            if (!oembedData?.author_name && playerObj.videoDetails?.author) {
              oembedData = { ...oembedData, author_name: playerObj.videoDetails.author };
            }
          }
        }
      } catch (err) {
        console.warn("Could not parse ytInitialPlayerResponse:", err);
      }
    }

    const $ = cheerio.load(html);

    // Extract OpenGraph / Meta title
    let metaTitle =
      oembedData?.title ||
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text().trim() ||
      $('meta[name="title"]').attr("content") ||
      domain;

    // Extract Description
    let metaDescription =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    if (youtubeFullDescription && youtubeFullDescription.length > metaDescription.length) {
      metaDescription = youtubeFullDescription.slice(0, 500);
    }

    // Extract Image
    let metaImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content") ||
      "";

    if (!metaImage && youtubeVideoId) {
      metaImage = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    }

    // Resolve relative image URLs
    if (metaImage && !metaImage.startsWith("http")) {
      try {
        metaImage = new URL(metaImage, url).toString();
      } catch {
        // ignore invalid URL
      }
    }

    // Extract Site Name
    const metaSiteName =
      $('meta[property="og:site_name"]').attr("content") ||
      domain.charAt(0).toUpperCase() + domain.slice(1);

    // Extract Author
    const metaAuthor =
      oembedData?.author_name ||
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      undefined;

    // Extract Published Date
    const metaPublishedDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publication_date"]').attr("content") ||
      undefined;

    // Extract Favicon
    let favicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href");

    if (favicon && !favicon.startsWith("http")) {
      try {
        favicon = new URL(favicon, url).toString();
      } catch {
        favicon = fallbackFavicon;
      }
    } else if (!favicon) {
      favicon = fallbackFavicon;
    }

    // Clean up noisy HTML elements before text extraction
    $("script, style, nav, footer, header, aside, noscript, iframe, svg, [role='alert'], .cookie-banner, .ads").remove();

    // Extract headings
    const headings: string[] = [];
    $("h1, h2, h3").each((_, el) => {
      const headingText = $(el).text().replace(/\s+/g, " ").trim();
      if (headingText && headingText.length > 5 && headingText.length < 120) {
        headings.push(headingText);
      }
    });

    // Extract paragraphs and main content
    const textBlocks: string[] = [];
    $("article p, main p, .content p, p").each((_, el) => {
      const p = $(el).text().replace(/\s+/g, " ").trim();
      if (p.length > 30) {
        textBlocks.push(p);
      }
    });

    // If YouTube, prioritize the full description with contacts & links
    if (youtubeFullDescription) {
      textBlocks.unshift(youtubeFullDescription);
    }

    // Append any on-screen details supplied by user
    if (onScreenNotes) {
      textBlocks.unshift(onScreenNotes);
    }

    const fullContent = textBlocks.join("\n\n").slice(0, 9500);

    // Extract contacts using regular expressions
    const detectedContacts = extractRegexContacts(
      fullContent + " " + (youtubeFullDescription || "") + " " + (onScreenNotes || "")
    );

    return {
      url,
      title: cleanTitle(metaTitle),
      description: metaDescription.trim(),
      image: metaImage || undefined,
      favicon,
      siteName: metaSiteName,
      author: metaAuthor,
      publishedDate: metaPublishedDate,
      extractedText: fullContent || metaDescription || metaTitle,
      headings: headings.slice(0, 6),
      rawFullDescription: youtubeFullDescription || undefined,
      detectedContacts,
      onScreenNotes,
    };
  } catch (error) {
    console.error("Scraping error:", error);
    const cleanDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
    const pathnameClean = parsedUrl.pathname.replace(/[\/-]/g, " ").trim();

    const fallbackText = onScreenNotes
      ? `On-screen details: ${onScreenNotes}`
      : `Webpage from ${domain}. Direct link: ${url}`;

    const detectedContacts = extractRegexContacts(fallbackText);

    return {
      url,
      title: pathnameClean ? `${pathnameClean} - ${cleanDomain}` : cleanDomain,
      description: `Link saved from ${domain}`,
      image: youtubeVideoId
        ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
        : undefined,
      favicon: fallbackFavicon,
      siteName: cleanDomain,
      extractedText: fallbackText,
      headings: [],
      detectedContacts,
      onScreenNotes,
    };
  }
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

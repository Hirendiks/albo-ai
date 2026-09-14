import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScrapedData, AISummary, ContentType, ExtractedContacts, KeyTakeawayItem } from "@/types";
import { deduplicatePhoneNumbers, getSourcePlatform } from "./scraper";

export async function analyzeContentWithAI(
  data: ScrapedData,
  apiKey?: string
): Promise<AISummary> {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      return await generateGeminiSummary(data, geminiKey);
    } catch (err) {
      console.warn("Gemini API call failed, falling back to heuristic analyzer:", err);
    }
  }

  // Graceful heuristic fallback
  return generateHeuristicSummary(data);
}

/**
 * Ensures key takeaways contain only unique, high-value insights,
 * completely filtering out redundant contact details, title echoes, and TL;DR clones.
 */
export function cleanAndDeduplicateTakeaways(
  takeaways: string[],
  title?: string,
  tldr?: string
): string[] {
  if (!takeaways || !Array.isArray(takeaways)) return [];

  const cleanTitle = (title || "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  const cleanTldr = (tldr || "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of takeaways) {
    if (!raw || typeof raw !== "string") continue;
    let point = raw.trim();
    if (point.length < 5) continue;

    const lower = point.toLowerCase();

    // 1. Omit contact bullets from takeaways — contacts have their own dedicated category!
    if (
      lower.includes("📞") ||
      lower.includes("contact & on-screen") ||
      lower.startsWith("phone:") ||
      lower.startsWith("whatsapp:") ||
      lower.startsWith("email:") ||
      lower.includes("contact details:")
    ) {
      continue;
    }

    // 2. Strip repetitive boilerplate prefixes
    point = point
      .replace(/^[🎥📦🛠️📌]\s*(?:video focus|project focus|tool overview|topic)\s*\/\s*(?:what it's about|what it is|what it does|what this is about):\s*/i, "")
      .trim();

    const lowerClean = point.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();

    // 3. Remove takeaways that merely echo the title or generic crawler boilerplate
    if (cleanTitle && (lowerClean === cleanTitle || lowerClean.startsWith(cleanTitle))) {
      const rest = lowerClean.replace(cleanTitle, "").trim();
      if (
        rest.length < 20 ||
        rest.includes("in depth discussion and insights") ||
        rest.includes("visual presentation and walkthrough")
      ) {
        continue;
      }
    }

    // 4. Remove takeaways that are 100% identical to the full TL;DR
    if (cleanTldr && lowerClean === cleanTldr) {
      continue;
    }

    // 5. Deduplicate identical or near-identical takeaways
    const key = lowerClean.slice(0, 35);
    if (seen.has(key)) continue;
    seen.add(key);

    result.push(point);
  }

  return result.slice(0, 5);
}

export interface ParsedTakeawayItem {
  emoji: string;
  title: string;
  body: string;
}

export function parseTakeawayLine(line: string): ParsedTakeawayItem {
  if (!line || typeof line !== "string") {
    return { emoji: "📌", title: "", body: "" };
  }

  const trimmed = line.trim();

  // Match emoji at start safely
  let emojiMatch: RegExpMatchArray | null = null;
  try {
    emojiMatch = trimmed.match(
      new RegExp("^([\\p{Extended_Pictographic}\\p{Emoji_Presentation}]|[\\uD83C-\\uD83E][\\uDF00-\\uDFFF])\\s*", "u")
    );
  } catch {
    emojiMatch = trimmed.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\s*/);
  }
  let emoji = emojiMatch ? emojiMatch[1] : "";
  let text = emojiMatch ? trimmed.slice(emojiMatch[0].length).trim() : trimmed;

  // Match "**Title** - Body" or "Title - Body" or "Title: Body"
  const splitMatch = text.match(/^([^:\-–—]{2,45})[:\-–—]\s*(.+)$/);
  if (splitMatch) {
    const rawTitle = splitMatch[1].replace(/^\*\*|\*\*$/g, "").trim();
    const rawBody = splitMatch[2].replace(/^\*\*|\*\*$/g, "").trim();
    return {
      emoji: emoji || "📌",
      title: rawTitle,
      body: rawBody,
    };
  }

  return {
    emoji: emoji || "📌",
    title: "",
    body: text,
  };
}

/**
 * Formats a key takeaway item with a small punchy title and content synthesized from spoken words and description.
 */
export function formatTakeawayItem(
  takeawayObj?: { title?: string; content?: string },
  rawTakeaways?: string[],
  spokenContent?: string,
  desc?: string
): KeyTakeawayItem {
  if (takeawayObj?.title && takeawayObj?.content) {
    return {
      title: takeawayObj.title.trim(),
      content: takeawayObj.content.trim(),
    };
  }

  // If there are takeaways in array
  if (rawTakeaways && rawTakeaways.length > 0) {
    const first = rawTakeaways[0];
    const match = first.match(/^([^:\-–—]{3,35})[:\-–—]\s*(.+)$/);
    if (match) {
      return {
        title: match[1].trim(),
        content: match[2].trim(),
      };
    }
    return {
      title: "Core Takeaway",
      content: first.trim(),
    };
  }

  if (spokenContent) {
    return {
      title: "Video Insight",
      content: spokenContent.slice(0, 220).trim(),
    };
  }

  return {
    title: "Core Takeaway",
    content: (desc || "Key resource and insight.").slice(0, 220).trim(),
  };
}

async function resolveImagePart(
  imageUrlOrBase64?: string
): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  if (!imageUrlOrBase64) return null;

  try {
    // 1. Data URI: data:image/png;base64,...
    if (imageUrlOrBase64.startsWith("data:")) {
      const match = imageUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        };
      }
    }

    // 2. HTTP/HTTPS URL
    if (imageUrlOrBase64.startsWith("http://") || imageUrlOrBase64.startsWith("https://")) {
      const res = await fetch(imageUrlOrBase64, {
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const contentType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        return {
          inlineData: {
            mimeType: contentType,
            data: buf.toString("base64"),
          },
        };
      }
    }
  } catch (err) {
    console.warn("Could not resolve image part for Gemini multimodal analysis:", err);
  }
  return null;
}

async function generateGeminiSummary(
  data: ScrapedData,
  apiKey: string
): Promise<AISummary> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const detectedType = detectContentType(data.url);

  // Attempt to load visual image/screenshot part for multimodal vision OCR
  const imageSource = data.screenshotImage || data.screenshot || data.image;
  const imagePart = await resolveImagePart(imageSource);

  const prompt = `You are an elite multimodal AI researcher and video transcript intelligence analyst.
Analyze the following webpage, video metadata, description, spoken dialogue, and attached visual image/screenshot. Return a structured JSON response.

URL: ${data.url}
Detected Content Type: ${detectedType}
Title: ${data.title}
Site: ${data.siteName}
Author: ${data.author || "Unknown"}
Headings: ${data.headings.join(", ")}
${data.onScreenNotes ? `User-noted on-screen / dialogue details:\n${data.onScreenNotes}\n` : ""}
Content sample, description & video dialogue:
${data.extractedText.slice(0, 7000)}

CRITICAL MISSION — POINT-WISE CRUX OF WHAT HAS BEEN SPOKEN (SO USER DOES NOT HAVE TO OPEN VIDEO):
The user is saving this video/bookmark specifically so they or any reader **DOES NOT HAVE TO OPEN OR WATCH THE VIDEO**!
They need the complete, substantive, point-by-point knowledge right here in text.

1. "keyTakeaways" (MANDATORY FORMAT: EMOJI + TOPIC TITLE + HYPHEN + CRISP CRUX):
   - You MUST format every item in "keyTakeaways" strictly in this structure:
     "[Emoji] [Short Topic/Feature Name] - [Crisp 1-sentence crux of what is spoken or revealed]"
   - Reference Examples:
     * "📸 AI Photo Editing - Now you can easily clean, extend, and reframe your photos."
     * "🧮 Siri AI App - Siri is now available as a dedicated app that understands screen context to work smarter."
     * "⚡ Better Performance - With iOS 27, apps will open up to 30% faster and AirDrop file transfer speed has improved by 80%."
     * "💰 Direct Factory Pricing - Quality slabs start at Rs. 140/sq ft with zero chemical fading."
   - MULTI-LANGUAGE TRANSLATION MANDATE:
     If the spoken video dialogue or audio is in Hindi, Spanish, or other regional languages, TRANSLATE and synthesize it into clear, authoritative English key takeaways in this exact structure!
   - Provide 3 to 6 distinct, high-value takeaways covering the core features, facts, or instructions spoken.
2. "keyTakeaway" (THE SINGLE PRIMARY INSIGHT):
   - "title": A short punchy title (2 to 4 words, e.g. "AI Photo Editing", "Siri AI App", "Better Performance").
   - "content": 1 to 2 clear, authoritative sentences stating the most valuable insight or rule from the video.
3. "summary":
   - An informative, high-density 2-3 sentence overview delivering the complete crux of what the content explains and concludes.
4. "sourcePlatform": Name of the platform ("Instagram", "YouTube", "X (Twitter)", "Facebook", "TikTok", "LinkedIn", "Reddit", "GitHub", etc.).
5. "phoneNumbers":
   - Carefully inspect visual image/screenshot, OCR text overlays, business boards, and descriptions for all contact phone numbers (including Indian 10-digit mobile numbers with/without +91, 0, or WhatsApp).
6. "location":
   - Extract shop location, city, state, or address if spoken, shown, or written (e.g. "Makrana, Rajasthan", "Kishangarh Marble Market", "Bandra, Mumbai"). Return null if not found.
7. "spokenOrOnScreenContent":
   - Chronological breakdown of what was spoken or demonstrated on video.

Return ONLY valid JSON matching this schema:
{
  "sourcePlatform": "Instagram",
  "summary": "2 to 3 substantive sentences delivering the complete crux of the video.",
  "keyTakeaway": {
    "title": "Short Punchy Title",
    "content": "Decisive takeaway synthesized from spoken dialogue and content."
  },
  "keyTakeaways": [
    "📸 Feature 1 - Exact facts or technique explained.",
    "🧮 Feature 2 - Specific numbers, prices, or steps.",
    "⚡ Feature 3 - Key advice, performance, or rule."
  ],
  "location": "City, State or Shop Location (if found)",
  "contactInfo": {
    "phoneNumbers": ["+91 98765 43210"],
    "emails": ["contact@example.com"],
    "links": ["https://..."],
    "whatsappOrSocials": ["@handle or wa.me/..."],
    "addressOrLocation": "Location if mentioned",
    "pricingOrOffers": "Price or promo code if mentioned"
  },
  "spokenOrOnScreenContent": "Detailed breakdown of spoken dialogue, demonstrations, and visual details shown on screen.",
  "detailedSummary": "A comprehensive 2-3 paragraph summary.",
  "tags": ["tag1", "tag2", "tag3"],
  "contentType": "article | video | repository | tool | paper | social | documentation | other",
  "estimatedReadTime": "X min read (or Video watch)"
}`;

  const contents = imagePart ? [prompt, imagePart] : prompt;
  const result = await model.generateContent(contents);
  const response = await result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text);
    const contentType = detectContentType(data.url, parsed.contentType);
    const rawTakeaways: string[] = Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [];

    // Deduplicate and clean takeaways (removes title echoes, contact bullets, duplicate lines)
    const takeaways = cleanAndDeduplicateTakeaways(rawTakeaways, data.title, parsed.summary || parsed.tldr);

    // Merge and strictly deduplicate contacts
    const aiPhones = Array.isArray(parsed.contactInfo?.phoneNumbers) ? parsed.contactInfo.phoneNumbers : [];
    const aiEmails = Array.isArray(parsed.contactInfo?.emails) ? parsed.contactInfo.emails : [];
    const aiLinks = Array.isArray(parsed.contactInfo?.links) ? parsed.contactInfo.links : [];

    const mergedPhones = deduplicatePhoneNumbers([...aiPhones, ...(data.detectedContacts?.phoneNumbers || [])]);
    const mergedEmails = Array.from(
      new Set([...aiEmails, ...(data.detectedContacts?.emails || [])].map((e) => e.toLowerCase().trim()))
    );
    const mergedLinks = Array.from(new Set([...aiLinks, ...(data.detectedContacts?.links || [])])).slice(0, 8);

    const sourcePlatform = parsed.sourcePlatform || getSourcePlatform(data.url, data.siteName).name;
    const location =
      parsed.location ||
      parsed.contactInfo?.addressOrLocation ||
      data.detectedContacts?.addressOrLocation ||
      undefined;

    const takeaway = formatTakeawayItem(
      parsed.keyTakeaway,
      takeaways,
      parsed.spokenOrOnScreenContent,
      data.description
    );

    const contacts: ExtractedContacts = {
      phoneNumbers: mergedPhones,
      emails: mergedEmails,
      links: mergedLinks,
      whatsappOrSocials: Array.isArray(parsed.contactInfo?.whatsappOrSocials)
        ? parsed.contactInfo.whatsappOrSocials
        : [],
      addressOrLocation: location,
      pricingOrOffers: parsed.contactInfo?.pricingOrOffers || undefined,
    };

    const finalSummary = parsed.summary || parsed.tldr || data.description || data.title;

    return {
      tldr: finalSummary,
      keyTakeaways: takeaways.length > 0 ? takeaways : [`${takeaway.title}: ${takeaway.content}`],
      takeaway,
      detailedSummary: parsed.detailedSummary || finalSummary || data.extractedText.slice(0, 500),
      actionableInsights: Array.isArray(parsed.actionableInsights)
        ? parsed.actionableInsights
        : ["Review the full resource via the original link."],
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : ["saved"],
      contentType,
      estimatedReadTime: parsed.estimatedReadTime || estimateReadTime(data.extractedText, contentType),
      isAiGenerated: true,
      contacts,
      spokenOrOnScreenContent: parsed.spokenOrOnScreenContent || (data.onScreenNotes ? `On-screen details: ${data.onScreenNotes}` : undefined),
      location,
      sourcePlatform,
    };
  } catch (jsonErr) {
    console.error("Failed to parse Gemini JSON output:", jsonErr, text);
    return generateHeuristicSummary(data);
  }
}

function formatHeuristicPoint(line: string): string {
  const trimmed = line.trim();
  try {
    if (new RegExp("^([\\p{Extended_Pictographic}\\p{Emoji_Presentation}])\\s*[^:\\-–—]+[:\\-–—]", "u").test(trimmed)) {
      return trimmed;
    }
  } catch {
    // ignore
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("photo") || lower.includes("फोटोज") || lower.includes("camera") || lower.includes("reframe") || lower.includes("image")) {
    return `📸 AI Photo Editing - ${trimmed.replace(/^[दोस्तोंअबसबसेपहले\s,]+/, "")}`;
  }
  if (lower.includes("siri") || lower.includes("सीरी") || lower.includes("intelligence") || lower.includes("screen awareness") || lower.includes("assistant")) {
    return `🧮 Siri AI App - ${trimmed.replace(/^[दोस्तोंअबसबसेपहले\s,]+/, "")}`;
  }
  if (lower.includes("performance") || lower.includes("परफॉर्मेंस") || lower.includes("speed") || lower.includes("faster") || lower.includes("airdrop") || lower.includes("30%") || lower.includes("80%")) {
    return `⚡ Better Performance - ${trimmed.replace(/^[दोस्तोंअबसबसेपहले\s,]+/, "")}`;
  }
  if (lower.includes("ios") || lower.includes("feature") || lower.includes("फीचर्स") || lower.includes("update") || lower.includes("नया")) {
    return `🚀 New Features - ${trimmed.replace(/^[दोस्तोंअबसबसेपहले\s,]+/, "")}`;
  }
  if (lower.includes("price") || lower.includes("rate") || lower.includes("rs.") || lower.includes("₹") || lower.includes("cost") || lower.includes("discount")) {
    return `💰 Pricing & Rates - ${trimmed}`;
  }
  if (lower.includes("location") || lower.includes("showroom") || lower.includes("address") || lower.includes("market") || lower.includes("city")) {
    return `📍 Location Details - ${trimmed}`;
  }
  if (lower.includes("quality") || lower.includes("marble") || lower.includes("stone") || lower.includes("material")) {
    return `✨ Material & Quality - ${trimmed}`;
  }

  return `💡 Key Insight - ${trimmed}`;
}

/**
 * Intelligent Heuristic NLP summarizer that works offline / with zero API keys.
 */
export function generateHeuristicSummary(data: ScrapedData): AISummary {
  const text = data.extractedText || data.description || data.title;
  let cleanText = text.replace(/\[SPOKEN VIDEO DIALOGUE & TRANSCRIPT[^\]]*\]:\s*/gi, "");

  // Content type
  const contentType = detectContentType(data.url);

  // Clean description of hashtag noise or debug prefix
  let cleanDesc = (data.description || "")
    .replace(/^VIDEO DESCRIPTION & CONTACT INFO:\s*/i, "")
    .replace(/\[SPOKEN VIDEO DIALOGUE & TRANSCRIPT[^\]]*\]:\s*/gi, "")
    .replace(/\[SPOKEN VIDEO DIALOGUE & TRANSCRIPT[^\]]*\]:\s*/gi, "")
    .trim();

  // If cleanDesc contains huge multi-paragraph text or links, take the first 1-2 paragraphs
  const descParagraphs = cleanDesc.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 15 && !p.startsWith("http"));
  if (descParagraphs.length > 0) {
    cleanDesc = descParagraphs.slice(0, 2).join(" ");
    if (cleanDesc.length > 350) {
      cleanDesc = cleanDesc.slice(0, 350).replace(/\s+\S*$/, "") + "...";
    }
  }

  const isOnlyHashtags = cleanDesc.split(/\s+/).every((w) => w.startsWith("#") || w.length < 3);

  let tldr = "";
  if (isOnlyHashtags || cleanDesc.length < 25) {
    if (contentType === "video") {
      tldr = `${data.title} — visual showcase and presentation by ${data.author || data.siteName || "creator"}.`;
    } else {
      tldr = `${data.title} — curated resource and insights from ${data.siteName || "the web"}.`;
    }
  } else {
    // Strip trailing bracketed keyword lists like [iOS 27, Siri AI App...] and hashtag clouds
    tldr = cleanDesc
      .replace(/\[(?:[^\]]*?(?:ios|app|iphone|reels|shorts|tags|keywords)[^\]]*?)\]/gi, "")
      .replace(/(?:#[\w\u0900-\u097F]+[\s,.]*){2,}/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Key takeaways: Extract point-wise crux from lines, bullets, and sentences
  const rawTakeaways: string[] = [];

  // 1. Line/bullet-based points (including Hindi danda split)
  const candidateLines = cleanText
    .split(/[\u0964\r?\n]+/)
    .map((l) => l.replace(/^[0-9]+[.)\-•*]\s*/, "").replace(/^[♪\s\-\*\•]+|[♪\s]+$/g, "").trim())
    .filter((l) => l.length > 20 && !l.toLowerCase().includes("cookie") && !l.startsWith("http"));

  for (const line of candidateLines) {
    if (rawTakeaways.length >= 5) break;
    if (!line.endsWith(":") && !rawTakeaways.some((r) => r.includes(line) || line.includes(r))) {
      rawTakeaways.push(formatHeuristicPoint(line));
    }
  }

  // 2. Prose sentence-based points if lines were insufficient
  const sentences = cleanText
    .split(/[\u0964.?!]|\n+/)
    .map((s) => s.replace(/^[0-9]+[.)\-•*]\s*/, "").replace(/^[♪\s\-\*\•]+|[♪\s]+$/g, "").trim())
    .filter((s) => s.length > 20 && !s.includes("cookie") && !s.startsWith("http"));

  if (rawTakeaways.length < 3) {
    for (const s of sentences) {
      if (rawTakeaways.length >= 5) break;
      if (!rawTakeaways.some((r) => r.includes(s) || s.includes(r))) {
        rawTakeaways.push(formatHeuristicPoint(s));
      }
    }
  }

  // Deduplicate and clean takeaways (removes title echoes, contact bullets, duplicate lines)
  let cleanTakeaways = cleanAndDeduplicateTakeaways(rawTakeaways, data.title, tldr);

  // If clean takeaways is empty, provide a clean contextual insight rather than repeating title
  if (cleanTakeaways.length === 0) {
    if (contentType === "video") {
      cleanTakeaways = [`Visual demonstration and core walkthrough presented by ${data.author || data.siteName || "creator"}.`];
    } else if (contentType === "repository") {
      cleanTakeaways = [`Open source codebase and software tooling implementation.`];
    } else {
      cleanTakeaways = [`Curated resource and reference materials from ${data.siteName || "the web"}.`];
    }
  }

  // Strictly deduplicated contacts
  const detectedPhones = deduplicatePhoneNumbers(data.detectedContacts?.phoneNumbers || []);
  const detectedEmails = Array.from(
    new Set((data.detectedContacts?.emails || []).map((e) => e.toLowerCase().trim()))
  );
  const detectedLinks = Array.from(new Set(data.detectedContacts?.links || [])).slice(0, 8);

  // Tags generation
  const candidateWords = (data.title + " " + (data.headings.join(" ") || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const uniqueTags = Array.from(new Set(candidateWords)).slice(0, 5);
  if (uniqueTags.length === 0) {
    uniqueTags.push("curated", "knowledge", "reference");
  }

  // Detailed summary
  const detailedSummary =
    sentences.length > 2
      ? sentences.slice(0, 4).join(" ")
      : `${data.description || "In-depth resource and insights curated from " + data.siteName}.`;

  // Spoken / On-screen explanation (without repeating contact numbers)
  let spokenOrOnScreenContent: string | undefined = undefined;
  if (data.onScreenNotes) {
    spokenOrOnScreenContent = `On-Screen & Spoken Details: ${data.onScreenNotes}`;
  } else if (data.rawFullDescription && !data.rawFullDescription.trim().startsWith("#") && data.rawFullDescription.trim().length > 30) {
    spokenOrOnScreenContent = `Video Narration & Context:\n${data.rawFullDescription.slice(0, 500)}`;
  } else if (contentType === "video") {
    spokenOrOnScreenContent = `Visual walkthrough and demonstration featuring ${data.author || data.siteName || "creator"}.`;
  }

  const sourcePlatform = getSourcePlatform(data.url, data.siteName).name;
  const location = data.detectedContacts?.addressOrLocation || undefined;
  const takeaway = formatTakeawayItem(
    undefined,
    cleanTakeaways,
    data.onScreenNotes || data.rawFullDescription,
    cleanDesc || data.title
  );

  return {
    tldr,
    keyTakeaways: cleanTakeaways.slice(0, 5),
    takeaway,
    detailedSummary,
    actionableInsights: [
      contentType === "video"
        ? `Watch key sections or follow the demonstration outlined by ${data.author || data.siteName || "the creator"}.`
        : `Save or share this reference for your ${uniqueTags[0] || "learning"} workflow.`,
      `Explore further discussions or related resources on ${data.siteName || "the original platform"}.`,
    ],
    tags: uniqueTags,
    contentType,
    estimatedReadTime: estimateReadTime(text, contentType),
    isAiGenerated: false,
    contacts: {
      phoneNumbers: detectedPhones,
      emails: detectedEmails,
      links: detectedLinks,
      whatsappOrSocials: [],
      addressOrLocation: location,
    },
    spokenOrOnScreenContent,
    location,
    sourcePlatform,
  };
}

function detectContentType(url: string, suggested?: string): ContentType {
  const u = url.toLowerCase();
  if (suggested && ["article", "video", "repository", "tool", "paper", "social", "documentation", "other"].includes(suggested)) {
    return suggested as ContentType;
  }
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com")) return "video";
  if (u.includes("github.com") || u.includes("gitlab.com")) return "repository";
  if (u.includes("arxiv.org") || u.includes("biorxiv.org") || u.includes("scholar.google")) return "paper";
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("threads.net") || u.includes("reddit.com")) return "social";
  if (u.includes("docs.") || u.includes("/docs") || u.includes("gitbook.io")) return "documentation";
  if (u.includes(".app") || u.includes("/product") || u.includes("producthunt.com")) return "tool";
  return "article";
}

function estimateReadTime(text: string, type?: ContentType): string {
  if (type === "video") return "Video watch";
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "have", "more", "will", "your", "what", "about",
  "which", "when", "there", "their", "they", "been", "some", "other", "into",
  "also", "these", "than", "them", "would", "like", "make", "just", "over",
  "after", "could", "first", "were", "where", "most", "know", "page", "home", "site"
]);

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScrapedData, AISummary, ContentType, ExtractedContacts } from "@/types";
import { deduplicatePhoneNumbers } from "./scraper";

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

    // 4. Remove takeaways that duplicate the TL;DR
    if (cleanTldr && (lowerClean === cleanTldr || cleanTldr.includes(lowerClean) || lowerClean.includes(cleanTldr))) {
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

  const prompt = `You are an elite multimodal AI researcher and visual OCR analyst.
Analyze the following webpage, video metadata, description, and attached visual image/screenshot. Return a structured JSON response.

URL: ${data.url}
Detected Content Type: ${detectedType}
Title: ${data.title}
Site: ${data.siteName}
Author: ${data.author || "Unknown"}
Headings: ${data.headings.join(", ")}
${data.onScreenNotes ? `User-noted on-screen / dialogue details:\n${data.onScreenNotes}\n` : ""}
Content sample & video description:
${data.extractedText.slice(0, 6000)}

CRITICAL MULTIMODAL & ON-SCREEN EXTRACTION INSTRUCTIONS:
1. "contactInfo":
   - IF AN IMAGE / SCREENSHOT IS ATTACHED: Carefully inspect every corner, banner, poster frame, text overlay, business board, watermark, and video subtitle.
   - Look for ALL contact phone numbers (including Indian 10-digit mobile numbers starting with 6/7/8/9, +91, 0, or formatted numbers), WhatsApp numbers/links, emails, shop or office addresses, city/state, pricing or discount offers, and social handles (@...).
   - Also scan the description, headings, and notes for phone numbers and contacts.
   - Return every detected phone number in contactInfo.phoneNumbers.
   - Return any WhatsApp link or handle in contactInfo.whatsappOrSocials.
   - Return shop name/address in contactInfo.addressOrLocation.
   - Return prices or offers in contactInfo.pricingOrOffers.
   - DO NOT include phone numbers, addresses, or emails in "keyTakeaways" or "tldr" — keep them strictly inside "contactInfo".
2. "spokenOrOnScreenContent":
   - Provide a clear, detailed 1-2 paragraph description of WHAT IS SPOKEN, NARRATED, OR SHOWN ON SCREEN in this video/page/screenshot (e.g. demonstrations, products showcased, key visual moments).
3. "keyTakeaways":
   - 3 to 5 distinct, high-value insights, findings, or points covered in this content.
   - DO NOT repeat the title.
   - DO NOT include phone numbers, WhatsApp, or contact details in keyTakeaways (they belong exclusively in contactInfo).
   - Every takeaway must provide genuine new information without repeating other takeaways.

Return ONLY valid JSON matching this schema:
{
  "tldr": "1 to 2 crisp, high-impact sentences summarizing the core value or main thesis. Do not include phone numbers or repeat the title verbatim.",
  "keyTakeaways": [
    "Distinct key insight 1",
    "Distinct key insight 2",
    "Distinct key insight 3"
  ],
  "detailedSummary": "A comprehensive 2-3 paragraph summary breaking down the context, main concepts, and why this matters.",
  "actionableInsights": [
    "Actionable tip or takeaway 1",
    "Actionable tip or takeaway 2"
  ],
  "contactInfo": {
    "phoneNumbers": ["+91 98765 43210"],
    "emails": ["contact@example.com"],
    "links": ["https://..."],
    "whatsappOrSocials": ["@handle or wa.me/..."],
    "addressOrLocation": "Address if mentioned",
    "pricingOrOffers": "Price or promo code if mentioned"
  },
  "spokenOrOnScreenContent": "Detailed breakdown of spoken dialogue, demonstrations, and visual details shown on screen.",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
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
    const takeaways = cleanAndDeduplicateTakeaways(rawTakeaways, data.title, parsed.tldr);

    // Merge and strictly deduplicate contacts
    const aiPhones = Array.isArray(parsed.contactInfo?.phoneNumbers) ? parsed.contactInfo.phoneNumbers : [];
    const aiEmails = Array.isArray(parsed.contactInfo?.emails) ? parsed.contactInfo.emails : [];
    const aiLinks = Array.isArray(parsed.contactInfo?.links) ? parsed.contactInfo.links : [];

    const mergedPhones = deduplicatePhoneNumbers([...aiPhones, ...(data.detectedContacts?.phoneNumbers || [])]);
    const mergedEmails = Array.from(
      new Set([...aiEmails, ...(data.detectedContacts?.emails || [])].map((e) => e.toLowerCase().trim()))
    );
    const mergedLinks = Array.from(new Set([...aiLinks, ...(data.detectedContacts?.links || [])])).slice(0, 8);

    const contacts: ExtractedContacts = {
      phoneNumbers: mergedPhones,
      emails: mergedEmails,
      links: mergedLinks,
      whatsappOrSocials: Array.isArray(parsed.contactInfo?.whatsappOrSocials)
        ? parsed.contactInfo.whatsappOrSocials
        : [],
      addressOrLocation: parsed.contactInfo?.addressOrLocation || undefined,
      pricingOrOffers: parsed.contactInfo?.pricingOrOffers || undefined,
    };

    return {
      tldr: parsed.tldr || data.description || data.title,
      keyTakeaways: takeaways,
      detailedSummary: parsed.detailedSummary || data.extractedText.slice(0, 500),
      actionableInsights: Array.isArray(parsed.actionableInsights)
        ? parsed.actionableInsights
        : ["Review the full resource via the original link."],
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : ["saved"],
      contentType,
      estimatedReadTime: parsed.estimatedReadTime || estimateReadTime(data.extractedText, contentType),
      isAiGenerated: true,
      contacts,
      spokenOrOnScreenContent: parsed.spokenOrOnScreenContent || (data.onScreenNotes ? `On-screen details: ${data.onScreenNotes}` : undefined),
    };
  } catch (jsonErr) {
    console.error("Failed to parse Gemini JSON output:", jsonErr, text);
    return generateHeuristicSummary(data);
  }
}

/**
 * Intelligent Heuristic NLP summarizer that works offline / with zero API keys.
 */
export function generateHeuristicSummary(data: ScrapedData): AISummary {
  const text = data.extractedText || data.description || data.title;
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && !s.includes("cookie") && !s.includes("privacy policy"));

  // Content type
  const contentType = detectContentType(data.url);

  // Clean description of hashtag noise or debug prefix
  let cleanDesc = (data.description || "")
    .replace(/^VIDEO DESCRIPTION & CONTACT INFO:\s*/i, "")
    .trim();
  const isOnlyHashtags = cleanDesc.split(/\s+/).every((w) => w.startsWith("#") || w.length < 3);

  let tldr = "";
  if (isOnlyHashtags || cleanDesc.length < 25) {
    if (contentType === "video") {
      tldr = `${data.title} — visual showcase and presentation by ${data.author || data.siteName || "creator"}.`;
    } else {
      tldr = `${data.title} — curated resource and insights from ${data.siteName || "the web"}.`;
    }
  } else {
    tldr = cleanDesc;
  }

  // Key takeaways from headings and informative sentences
  const rawTakeaways: string[] = [];
  if (data.headings.length > 0) {
    data.headings.slice(0, 3).forEach((h) => rawTakeaways.push(h));
  }
  if (sentences.length > 0) {
    for (const s of sentences) {
      if (rawTakeaways.length >= 4) break;
      if (!rawTakeaways.includes(s)) rawTakeaways.push(s);
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

  return {
    tldr,
    keyTakeaways: cleanTakeaways.slice(0, 5),
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
    },
    spokenOrOnScreenContent,
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

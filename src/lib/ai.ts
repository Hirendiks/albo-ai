import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScrapedData, AISummary, ContentType, ExtractedContacts } from "@/types";

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

  const prompt = `You are an elite research assistant and multimodal content analyst.
Analyze the following webpage, video metadata, description, and on-screen details. Return a structured JSON response.

URL: ${data.url}
Detected Content Type: ${detectedType}
Title: ${data.title}
Site: ${data.siteName}
Author: ${data.author || "Unknown"}
Headings: ${data.headings.join(", ")}
Content sample & video description:
${data.extractedText.slice(0, 6000)}

CRITICAL EXTRACTION INSTRUCTIONS:
1. "contactInfo":
   - Carefully look for ANY contact details (phone numbers, WhatsApp numbers, customer service, sales numbers, emails, addresses, website links, social media handles, pricing or promo codes) mentioned in the video, on screen, or in the description.
   - Return them in the "contactInfo" object.
2. "spokenOrOnScreenContent":
   - Provide a clear, detailed 1-2 paragraph description of WHAT IS SPOKEN, NARRATED, OR SHOWN ON SCREEN in this video/page (e.g. demonstrations, explanations, key visual moments, contact numbers displayed).
3. "keyTakeaways":
   - The VERY FIRST ITEM in "keyTakeaways" MUST explicitly state what this content is about:
     * If this is a VIDEO: Start with "🎥 Video Focus / What it's about: [Description of what the video covers, the demonstration, the speaker's premise, and subject matter]".
     * If this is a CODE REPOSITORY or TOOL: Start with "📦 Project Focus / What it is: [Description of what this project/software does, its core capabilities and purpose]".
     * If this is an ARTICLE or GUIDE: Start with "📌 Topic / What this is about: [Description of the core subject matter and primary thesis]".
   - If contact numbers or WhatsApp are detected, make sure one of the bullet points starts with "📞 Contact & On-Screen Details: [Phone numbers, emails, links]".
   - Include 2-3 other key insights, data points, or takeaways.

Return ONLY valid JSON matching this schema:
{
  "tldr": "1 to 2 crisp, high-impact sentences summarizing the core value or main thesis.",
  "keyTakeaways": [
    "🎥 Video Focus / What it's about: ...",
    "Key insight 2",
    "📞 Contact & On-Screen Details: Phone: ..., Email: ...",
    "Key insight 4"
  ],
  "detailedSummary": "A comprehensive 2-3 paragraph summary breaking down the context, main concepts, and why this matters.",
  "actionableInsights": [
    "Actionable tip or takeaway 1",
    "Actionable tip or takeaway 2"
  ],
  "contactInfo": {
    "phoneNumbers": ["+1234567890"],
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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text);
    const contentType = detectContentType(data.url, parsed.contentType);
    let takeaways: string[] = Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [];

    if (takeaways.length === 0) {
      takeaways = [data.description || data.title];
    }
    const firstLower = (takeaways[0] || "").toLowerCase();
    if (contentType === "video" && !firstLower.includes("video focus") && !firstLower.includes("what it's about") && !firstLower.includes("video is about")) {
      takeaways[0] = `🎥 Video Focus / What it's about: ${takeaways[0]}`;
    } else if (contentType === "repository" && !firstLower.includes("project focus") && !firstLower.includes("what it is")) {
      takeaways[0] = `📦 Project Focus / What it is: ${takeaways[0]}`;
    } else if (contentType !== "video" && contentType !== "repository" && !firstLower.includes("what this is about") && !firstLower.includes("topic /")) {
      takeaways[0] = `📌 Topic / What this is about: ${takeaways[0]}`;
    }

    // Merge regex-detected contacts if AI missed any
    const aiPhones = Array.isArray(parsed.contactInfo?.phoneNumbers) ? parsed.contactInfo.phoneNumbers : [];
    const aiEmails = Array.isArray(parsed.contactInfo?.emails) ? parsed.contactInfo.emails : [];
    const aiLinks = Array.isArray(parsed.contactInfo?.links) ? parsed.contactInfo.links : [];

    const mergedPhones = Array.from(new Set([...aiPhones, ...(data.detectedContacts?.phoneNumbers || [])]));
    const mergedEmails = Array.from(new Set([...aiEmails, ...(data.detectedContacts?.emails || [])]));
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
      spokenOrOnScreenContent: parsed.spokenOrOnScreenContent || undefined,
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

  // Key takeaways from sentences
  const keyTakeaways: string[] = [];
  if (data.headings.length > 0) {
    data.headings.slice(0, 3).forEach((h) => keyTakeaways.push(h));
  }
  if (sentences.length > 1 && keyTakeaways.length < 4) {
    const sampled = sentences.slice(1, 4);
    sampled.forEach((s) => {
      if (!keyTakeaways.includes(s)) keyTakeaways.push(s);
    });
  }

  // Generate primary "What it's about" takeaway
  let primaryTakeaway = "";
  if (contentType === "video") {
    primaryTakeaway = `🎥 Video Focus / What it's about: ${data.title} — visual presentation and walkthrough covering core concepts and demonstrations by ${data.author || data.siteName || "creator"}.`;
  } else if (contentType === "repository") {
    primaryTakeaway = `📦 Project Focus / What it is: ${data.title} — open source codebase and technical tooling implementation on ${data.siteName || "GitHub"}.`;
  } else if (contentType === "tool") {
    primaryTakeaway = `🛠️ Tool Overview / What it does: ${data.title} — software utility and application designed to streamline workflows.`;
  } else {
    primaryTakeaway = `📌 Topic / What this is about: ${data.title} — in-depth discussion and insights curated from ${data.siteName || "the web"}.`;
  }

  const finalTakeaways = [primaryTakeaway, ...keyTakeaways];

  // Contacts
  const detectedPhones = data.detectedContacts?.phoneNumbers || [];
  const detectedEmails = data.detectedContacts?.emails || [];
  const detectedLinks = data.detectedContacts?.links || [];

  if (detectedPhones.length > 0 || detectedEmails.length > 0) {
    const contactPieces: string[] = [];
    if (detectedPhones.length > 0) contactPieces.push(`Phone: ${detectedPhones.join(", ")}`);
    if (detectedEmails.length > 0) contactPieces.push(`Email: ${detectedEmails.join(", ")}`);
    finalTakeaways.push(`📞 Contact & On-Screen Details: ${contactPieces.join(" • ")}`);
  }

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
      : `${data.title}. ${data.description || "Contains in-depth information, resources, and insights from " + data.siteName}.`;

  // Spoken / On-screen explanation
  let spokenOrOnScreenContent: string | undefined = undefined;
  if (data.onScreenNotes) {
    spokenOrOnScreenContent = `On-Screen & Spoken Details noted: ${data.onScreenNotes}`;
  } else if (data.rawFullDescription && !data.rawFullDescription.trim().startsWith("#") && data.rawFullDescription.trim().length > 30) {
    spokenOrOnScreenContent = `Video Narration & Details:\n${data.rawFullDescription.slice(0, 500)}`;
  } else if (contentType === "video") {
    spokenOrOnScreenContent = `Visual walkthrough and demonstration featuring "${data.title}" by ${data.author || data.siteName || "creator"}.`;
  }

  return {
    tldr,
    keyTakeaways: finalTakeaways.slice(0, 5),
    detailedSummary,
    actionableInsights: [
      contentType === "video"
        ? `Watch key sections or follow the demonstration outlined in ${data.title}.`
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

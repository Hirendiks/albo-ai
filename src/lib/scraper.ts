import * as cheerio from "cheerio";
import { ScrapedData } from "@/types";

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

export function deduplicatePhoneNumbers(phones: string[]): string[] {
  if (!phones || phones.length === 0) return [];
  const seenDigits = new Set<string>();
  const result: string[] = [];

  for (const raw of phones) {
    const trimmed = raw.replace(/[.,;:)\]]+$/, "").trim();
    if (!trimmed) continue;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) continue;

    // Filter out typical years (2020-2029) if 8 digits or less
    if (/^202[0-9]/.test(digits) && digits.length <= 8) continue;
    // Filter out dimension resolutions (e.g. 1920x1080)
    if (/^\d{3,4}[xX]\d{3,4}$/.test(trimmed)) continue;

    // Deduplicate by the last 10 significant digits (unifies 99250..., +91 99250..., 099250...)
    const key = digits.length >= 10 ? digits.slice(-10) : digits;
    if (seenDigits.has(key)) continue;
    seenDigits.add(key);

    // Format clean standard representation:
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      result.push(trimmed.includes("+91") ? trimmed : `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`);
    } else if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
      result.push(`+91 ${digits.slice(2, 7)} ${digits.slice(7)}`);
    } else {
      result.push(trimmed);
    }
  }

  return result.slice(0, 6);
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

  const foundPhones: string[] = [];

  // 2. WhatsApp links (wa.me/919925012345 or api.whatsapp.com/send?phone=...)
  const waRegex = /(?:wa\.me\/(?:(?:\+|00)?(\d{7,15}))|api\.whatsapp\.com\/send\?(?:[^&]*&)*phone=(?:(?:\+|00)?(\d{7,15})))/gi;
  let waMatch;
  while ((waMatch = waRegex.exec(text)) !== null) {
    const num = waMatch[1] || waMatch[2];
    if (num && num.length >= 8 && num.length <= 15) {
      foundPhones.push(num.startsWith("91") && num.length === 12 ? `+${num}` : num);
    }
  }

  // 3. Keyword-anchored contacts (Call: 9925012345, WhatsApp: +91 98251 67890, Mo: 98110..., Helpline: ...)
  const anchoredRegex = /(?:call|phone|ph|mob|mo|whatsapp|wa|contact|booking|helpline|order|tel|cust(?:omer)?\s*care)[\s.:-]*([+\d\s().-]{7,20})/gi;
  let anchMatch;
  while ((anchMatch = anchoredRegex.exec(text)) !== null) {
    const candidate = anchMatch[1].trim();
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      foundPhones.push(candidate);
    }
  }

  // 4. Standalone Indian 10-digit mobile numbers (starts with 6, 7, 8, or 9, with optional +91, 91, or 0)
  const indianMobileRegex = /(?:(?:\+|00)91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}\b|(?:(?:\+|00)91[\s.-]?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b|(?:(?:\+|00)91[\s.-]?)?[6-9]\d{9}\b/g;
  const rawIndian = text.match(indianMobileRegex) || [];
  rawIndian.forEach((p) => foundPhones.push(p.trim()));

  // 5. Standard international phone number extraction (brackets, dashes, spaces, country codes)
  const generalPhoneRegex = /(?:(?:\+|00)\d{1,4}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{3,5}(?:[-.\s]*\d{1,5})?/g;
  const rawPhones = text.match(generalPhoneRegex) || [];
  rawPhones.forEach((p) => foundPhones.push(p.trim()));

  // Deduplicate and canonicalize all phone numbers
  const validPhones = deduplicatePhoneNumbers(foundPhones);

  // 6. URLs and social links
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
  onScreenNotes?: string,
  screenshotImage?: string
): Promise<ScrapedData> {
  const url = normalizeUrl(rawUrl);
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  // Default fallback favicon using Google's reliable high-res favicon service
  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // Specialized Platform Handlers
  const isYouTube = domain.includes("youtube.com") || domain.includes("youtu.be");
  const isTikTok = domain.includes("tiktok.com");
  const isInstagram = domain.includes("instagram.com") || domain.includes("threads.net");
  const isTwitter = domain === "x.com" || domain === "twitter.com";
  const isReddit = domain.includes("reddit.com");
  const isSpotify = domain.includes("spotify.com");
  const isVimeo = domain.includes("vimeo.com");
  const isFacebook = domain.includes("facebook.com") || domain.includes("fb.watch");

  let youtubeVideoId: string | null = null;
  let oembedData: { title?: string; author_name?: string; thumbnail_url?: string; description?: string } | null = null;
  let youtubeFullDescription = "";
  let mlScreenshot: string | undefined = undefined;

  // 1. YouTube oEmbed
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

  // 2. TikTok oEmbed (Official public API, fast & reliable)
  if (isTikTok) {
    try {
      const ttRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (ttRes.ok) {
        const ttData = await ttRes.json();
        oembedData = {
          title: ttData.title || undefined,
          author_name: ttData.author_name || undefined,
          thumbnail_url: ttData.thumbnail_url || undefined,
          description: ttData.title ? `TikTok video by ${ttData.author_name || 'creator'}: ${ttData.title}` : undefined,
        };
      }
    } catch (e) {
      console.warn("TikTok oembed attempt failed:", e);
    }
  }

  // 3. Twitter / X via fxtwitter API
  if (isTwitter && parsedUrl.pathname.includes("/status/")) {
    try {
      const fxUrl = `https://api.fxtwitter.com${parsedUrl.pathname}`;
      const fxRes = await fetch(fxUrl, { signal: AbortSignal.timeout(5000) });
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        if (fxData.tweet) {
          oembedData = {
            title: `${fxData.tweet.author?.name || 'Post'} on X`,
            author_name: fxData.tweet.author?.name ? `${fxData.tweet.author.name} (@${fxData.tweet.author.screen_name})` : undefined,
            thumbnail_url: fxData.tweet.media?.photos?.[0]?.url || fxData.tweet.author?.avatar_url || undefined,
            description: fxData.tweet.text || undefined,
          };
        }
      }
    } catch (e) {
      console.warn("Twitter fxtwitter attempt failed:", e);
    }
  }

  // 4. Instagram & Threads handler (Extracts shortcode, creator, Microlink preview thumbnail, and caption)
  if (isInstagram) {
    try {
      const isReel = parsedUrl.pathname.includes("/reel/") || parsedUrl.pathname.includes("/reels/");
      const isPost = parsedUrl.pathname.includes("/p/");
      const shortcodeMatch = parsedUrl.pathname.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
      const shortcode = shortcodeMatch ? shortcodeMatch[1] : "";

      const usernameMatch = parsedUrl.pathname.match(/^\/([a-zA-Z0-9_.]+)(?:\/(?:p|reel|reels)\/|$)/);
      const username = usernameMatch && !["p", "reel", "reels", "stories", "explore"].includes(usernameMatch[1])
        ? `@${usernameMatch[1]}`
        : "";

      let mlImage: string | undefined = undefined;
      let mlTitle: string | undefined = undefined;
      let mlDesc: string | undefined = undefined;

      try {
        const mlRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true`, {
          signal: AbortSignal.timeout(6000),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData.data) {
            if (mlData.data.screenshot?.url) {
              mlScreenshot = mlData.data.screenshot.url;
            }
            if (mlData.data.image?.url) {
              mlImage = mlData.data.image.url;
            }
            if (mlData.data.title && !/^(instagram|threads)$/i.test(mlData.data.title.trim())) {
              mlTitle = mlData.data.title;
            }
            if (mlData.data.description && !/^(instagram|threads)$/i.test(mlData.data.description.trim())) {
              mlDesc = mlData.data.description;
            }
          }
        }
      } catch (e) {
        console.warn("Instagram Microlink attempt failed:", e);
      }

      const typeLabel = isReel ? "Instagram Reel" : isPost ? "Instagram Post" : "Instagram Profile";
      const authorDisplay = username || (onScreenNotes && onScreenNotes.includes("@") ? onScreenNotes.match(/@[a-zA-Z0-9_.]+/)?.[0] : undefined);
      const displayTitle = mlTitle || (authorDisplay ? `${typeLabel} by ${authorDisplay}` : `${typeLabel} (${shortcode || 'Media'})`);
      const displayDesc = mlDesc || onScreenNotes || `${typeLabel} on Instagram${authorDisplay ? ` by ${authorDisplay}` : ''}.`;

      oembedData = {
        title: displayTitle,
        author_name: authorDisplay || "Instagram Creator",
        thumbnail_url: mlImage || mlScreenshot,
        description: displayDesc,
      };
    } catch (err) {
      console.warn("Instagram metadata extraction failed:", err);
    }
  }

  // 5. Spotify oEmbed
  if (isSpotify) {
    try {
      const spRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000) });
      if (spRes.ok) {
        const spData = await spRes.json();
        oembedData = {
          title: spData.title || undefined,
          thumbnail_url: spData.thumbnail_url || undefined,
          description: `Spotify track: ${spData.title || ''}`,
        };
      }
    } catch {}
  }

  // 5. Vimeo oEmbed
  if (isVimeo) {
    try {
      const vimRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000) });
      if (vimRes.ok) {
        const vimData = await vimRes.json();
        oembedData = {
          title: vimData.title || undefined,
          author_name: vimData.author_name || undefined,
          thumbnail_url: vimData.thumbnail_url || undefined,
          description: vimData.description || undefined,
        };
      }
    } catch {}
  }

  // 6. Reddit JSON API
  if (isReddit && parsedUrl.pathname.includes("/comments/")) {
    try {
      const cleanPath = parsedUrl.pathname.replace(/\/$/, "");
      const redRes = await fetch(`https://www.reddit.com${cleanPath}.json`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AlboBot/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (redRes.ok) {
        const redData = await redRes.json();
        const post = redData?.[0]?.data?.children?.[0]?.data;
        if (post) {
          oembedData = {
            title: post.title || undefined,
            author_name: post.author ? `u/${post.author} in r/${post.subreddit}` : undefined,
            description: post.selftext || `Reddit discussion in r/${post.subreddit}`,
            thumbnail_url: post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : undefined,
          };
        }
      }
    } catch (e) {
      console.warn("Reddit JSON attempt failed:", e);
    }
  }

  // Choose optimal User-Agent based on domain
  let requestUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
  if (isInstagram || isFacebook || isTwitter) {
    // Meta / social preview crawler user-agent returns full OG meta tags without login gates
    requestUa = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
  }

  try {
    let response = await fetch(url, {
      headers: {
        "User-Agent": requestUa,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    // If blocked (403 / 401 / 429) on desktop/mobile UA, retry with social preview crawler
    if (!response.ok && requestUa !== "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)") {
      try {
        const retryRes = await fetch(url, {
          headers: {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        if (retryRes.ok) {
          response = retryRes;
        }
      } catch {}
    }

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

    // Sanitize title if blocked / login gate
    if (
      !metaTitle ||
      metaTitle.toLowerCase().includes("403 forbidden") ||
      metaTitle.toLowerCase().includes("access denied") ||
      metaTitle.toLowerCase().includes("just a moment...") ||
      metaTitle.toLowerCase().includes("attention required") ||
      metaTitle.toLowerCase() === "instagram"
    ) {
      if (oembedData?.title) {
        metaTitle = oembedData.title;
      } else {
        const slug = parsedUrl.pathname
          .replace(/[\/-]/g, " ")
          .replace(/\.[a-zA-Z0-9]+$/, "")
          .trim();
        metaTitle = slug ? `${slug} - ${domain}` : domain;
      }
    }

    // Extract Description
    let metaDescription =
      oembedData?.description ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    if (youtubeFullDescription && youtubeFullDescription.length > metaDescription.length) {
      metaDescription = youtubeFullDescription.slice(0, 500);
    }

    // Extract Image (prioritize user uploaded screenshot, then oembed / meta, then screenshot)
    let metaImage =
      screenshotImage ||
      oembedData?.thumbnail_url ||
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content") ||
      mlScreenshot ||
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
      screenshot: screenshotImage || mlScreenshot || undefined,
      screenshotImage,
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
      image: screenshotImage || (youtubeVideoId
        ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
        : undefined),
      screenshot: screenshotImage || undefined,
      screenshotImage,
      favicon: fallbackFavicon,
      siteName: cleanDomain,
      extractedText: fallbackText,
      headings: [],
      detectedContacts,
      onScreenNotes,
    };
  }
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#064;/g, "@")
    .replace(/&#x2022;/g, "•")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanTitle(raw: string): string {
  if (!raw) return "";
  return decodeHtmlEntities(raw)
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

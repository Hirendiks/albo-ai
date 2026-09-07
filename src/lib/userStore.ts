import fs from "fs";
import path from "path";
import { Category, AnalyzedLink } from "@/types";

export interface StoredUserData {
  email: string;
  name?: string;
  image?: string;
  categories: Category[];
  links: AnalyzedLink[];
  lastSyncedAt: number;
}

// In-memory store fallback for environments without disk or DB
const memoryStore = new Map<string, StoredUserData>();

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

function getRedisKey(email: string): string {
  return `albo_user_${email.toLowerCase().trim().replace(/[^a-z0-9]/g, "_")}`;
}

function ensureLocalDirectoryExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore on read-only environments (e.g. Vercel serverless)
  }
}

function getUserFilePath(email: string): string {
  const safeName = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  return path.join(DATA_DIR, `${safeName}.json`);
}

/**
 * Reads user data from Upstash Redis, or falls back to local file storage / memory.
 * Returns null if user has no prior cloud record.
 */
export async function getUserData(email: string): Promise<StoredUserData | null> {
  const cleanEmail = email.toLowerCase().trim();
  const upstash = getUpstashConfig();

  if (upstash) {
    try {
      const key = getRedisKey(cleanEmail);
      const res = await fetch(`${upstash.url}/get/${encodeURIComponent(key)}`, {
        headers: {
          Authorization: `Bearer ${upstash.token}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.result) {
          const raw = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
          return raw as StoredUserData;
        }
        return null;
      }
    } catch (err) {
      console.warn("Upstash Redis get error, falling back to local/memory store:", err);
    }
  }

  // Fallback 1: Local file system
  try {
    ensureLocalDirectoryExists();
    const filePath = getUserFilePath(cleanEmail);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Fallback 2: In-memory store
    return memoryStore.get(cleanEmail) || null;
  }

  return memoryStore.get(cleanEmail) || null;
}

/**
 * Saves user data to Upstash Redis, with fallback to local file storage and memory.
 */
export async function saveUserData(
  email: string,
  data: {
    categories: Category[];
    links: AnalyzedLink[];
    name?: string;
    image?: string;
  }
): Promise<StoredUserData> {
  const cleanEmail = email.toLowerCase().trim();
  const record: StoredUserData = {
    email: cleanEmail,
    name: data.name,
    image: data.image,
    categories: data.categories,
    links: data.links,
    lastSyncedAt: Date.now(),
  };

  // Always keep in-memory cache updated
  memoryStore.set(cleanEmail, record);

  const upstash = getUpstashConfig();
  if (upstash) {
    try {
      const key = getRedisKey(cleanEmail);
      await fetch(`${upstash.url}/set/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
        cache: "no-store",
      });
      return record;
    } catch (err) {
      console.warn("Upstash Redis set error, falling back to local file store:", err);
    }
  }

  // Local file storage fallback
  try {
    ensureLocalDirectoryExists();
    const filePath = getUserFilePath(cleanEmail);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");
  } catch (err) {
    console.warn("Local file write skipped (ephemeral environment):", err);
  }

  return record;
}

/**
 * Smart Two-Way Reconciliation & Merge:
 * Merges client categories and links with any existing cloud categories and links.
 * Preserves edits by comparing timestamps (updatedAt / createdAt).
 */
export async function mergeAndSyncUserData(
  email: string,
  clientCategories: Category[],
  clientLinks: AnalyzedLink[],
  userMeta?: { name?: string; image?: string }
): Promise<StoredUserData> {
  const cleanEmail = email.toLowerCase().trim();
  const cloudData = await getUserData(cleanEmail);

  // Filter out any demo sample links (link-sample-*) so user accounts are strictly personal
  const realClientLinks = (clientLinks || []).filter(
    (l) => !l.id.startsWith("link-sample-")
  );

  if (!cloudData) {
    // First time syncing this Google account: start completely clean without demo data!
    return await saveUserData(cleanEmail, {
      categories: clientCategories && clientCategories.length > 0 ? clientCategories : [],
      links: realClientLinks, // strictly empty [] for a new user!
      name: userMeta?.name,
      image: userMeta?.image,
    });
  }

  // 1. Merge Categories
  const categoryMap = new Map<string, Category>();
  for (const cat of cloudData.categories || []) {
    categoryMap.set(cat.id, cat);
  }
  for (const clientCat of clientCategories || []) {
    const existing = categoryMap.get(clientCat.id);
    if (!existing) {
      categoryMap.set(clientCat.id, clientCat);
    } else {
      if ((clientCat.createdAt || 0) >= (existing.createdAt || 0)) {
        categoryMap.set(clientCat.id, clientCat);
      }
    }
  }
  const mergedCategories = Array.from(categoryMap.values());

  // 2. Merge Links (strictly ensuring no demo sample links)
  const linkMap = new Map<string, AnalyzedLink>();
  for (const link of cloudData.links || []) {
    if (!link.id.startsWith("link-sample-")) {
      linkMap.set(link.id, link);
    }
  }
  for (const clientLink of realClientLinks) {
    const existing = linkMap.get(clientLink.id);
    if (!existing) {
      linkMap.set(clientLink.id, clientLink);
    } else {
      const clientTime = clientLink.updatedAt || clientLink.createdAt || 0;
      const cloudTime = existing.updatedAt || existing.createdAt || 0;
      if (clientTime >= cloudTime) {
        linkMap.set(clientLink.id, clientLink);
      }
    }
  }

  // Sort links: pinned first, then newest
  const mergedLinks = Array.from(linkMap.values()).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  return await saveUserData(cleanEmail, {
    categories: mergedCategories,
    links: mergedLinks,
    name: userMeta?.name || cloudData.name,
    image: userMeta?.image || cloudData.image,
  });
}

import { UserProfile } from "@/types/auth";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "albo_session_v1";

/**
 * Creates a signed/encoded session token string for the given user profile.
 */
export function createSessionToken(user: UserProfile): string {
  const payload = {
    ...user,
    issuedAt: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Parses and verifies the session token string.
 */
export function parseSessionToken(token: string): UserProfile | null {
  try {
    const jsonStr = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.email || !parsed.id) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name || parsed.email.split("@")[0],
      image: parsed.image,
      provider: parsed.provider || "google",
      lastLoginAt: parsed.lastLoginAt || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Helper to retrieve current session from Next.js cookies (App Router server components / routes).
 */
export function getServerSession(): UserProfile | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return parseSessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Decodes a Google OAuth / Identity Services JWT credential string (header.payload.signature).
 */
export function decodeGoogleCredential(credential: string): {
  email: string;
  name: string;
  picture?: string;
  sub: string;
} | null {
  try {
    const parts = credential.split(".");
    if (parts.length !== 3) return null;
    const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);
    if (!payload.email) return null;
    return {
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture,
      sub: payload.sub,
    };
  } catch {
    return null;
  }
}

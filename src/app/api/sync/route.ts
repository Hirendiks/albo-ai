import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, parseSessionToken } from "@/lib/auth";
import { getUserData, mergeAndSyncUserData } from "@/lib/userStore";
import { Category, AnalyzedLink } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = parseSessionToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    const cloudData = await getUserData(user.email);
    if (!cloudData) {
      return NextResponse.json({
        success: true,
        categories: null,
        links: null,
        lastSyncedAt: 0,
        message: "No cloud data yet for this account",
      });
    }

    return NextResponse.json({
      success: true,
      categories: cloudData.categories,
      links: cloudData.links,
      lastSyncedAt: cloudData.lastSyncedAt,
    });
  } catch (err: any) {
    console.error("Sync GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch cloud sync" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in with Google." },
        { status: 401 }
      );
    }

    const user = parseSessionToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const categories: Category[] = body.categories || [];
    const links: AnalyzedLink[] = body.links || [];

    // Perform two-way smart merge
    const merged = await mergeAndSyncUserData(user.email, categories, links, {
      name: user.name,
      image: user.image,
    });

    return NextResponse.json({
      success: true,
      categories: merged.categories,
      links: merged.links,
      lastSyncedAt: merged.lastSyncedAt,
      email: user.email,
    });
  } catch (err: any) {
    console.error("Sync POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to synchronize data" },
      { status: 500 }
    );
  }
}

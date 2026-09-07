import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/types/auth";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  decodeGoogleCredential,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, email, name, image, quickMode } = body;

    let user: UserProfile | null = null;

    if (credential) {
      // Decode official Google Identity credential JWT
      const decoded = decodeGoogleCredential(credential);
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: "Invalid Google credential provided" },
          { status: 400 }
        );
      }
      user = {
        id: `google-${decoded.sub}`,
        email: decoded.email.toLowerCase(),
        name: decoded.name,
        image: decoded.picture,
        provider: "google",
        lastLoginAt: Date.now(),
      };
    } else if (email && email.includes("@")) {
      // Quick Mode / Direct Gmail login
      const cleanEmail = email.trim().toLowerCase();
      const derivedName = name?.trim() || cleanEmail.split("@")[0];
      const avatarUrl =
        image ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

      user = {
        id: `gmail-${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
        email: cleanEmail,
        name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
        image: avatarUrl,
        provider: quickMode ? "quick_google" : "google",
        lastLoginAt: Date.now(),
      };
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Missing email or valid Google credential" },
        { status: 400 }
      );
    }

    // Create session token
    const token = createSessionToken(user);

    // Set cookie on response
    const response = NextResponse.json({
      success: true,
      user,
      message: "Signed in successfully with Google",
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Google sign in error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to authenticate" },
      { status: 500 }
    );
  }
}

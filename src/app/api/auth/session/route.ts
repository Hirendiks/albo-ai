import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, parseSessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = parseSessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

// app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE } from "@/lib/admin/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildLogoutResponse(req: NextRequest) {
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  // Ensure we don't accidentally append /admin/login to something like https://example.com/api/admin/logout
  if (baseUrl === req.url) {
    const parsed = new URL(req.url);
    baseUrl = parsed.origin;
  }
  
  const dest = new URL("/admin/login", baseUrl);
  dest.searchParams.set("logged_out", "1");
  
  const res = NextResponse.redirect(dest);
  res.cookies.set(ADMIN_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}

export function GET(req: NextRequest) {
  return buildLogoutResponse(req);
}

export function POST(req: NextRequest) {
  return buildLogoutResponse(req);
}

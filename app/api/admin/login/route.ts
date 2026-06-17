// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_AUTH_MAX_AGE,
  signAdminToken,
} from "@/lib/admin/adminAuth";

function sanitizeNextPath(next: string) {
  if (!next.startsWith("/") || next.startsWith("/api")) {
    return "/admin";
  }
  return next;
}

function setSignedCookie(res: NextResponse) {
  const token = signAdminToken();
  res.cookies.set(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_AUTH_MAX_AGE,
  });
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  let pass = "";
  let next = "/admin";

  if (ct.includes("application/json")) {
    const body = await req.json();
    pass = String(body?.passcode || body?.password || "");
    next = String(body?.next || "/admin");
  } else {
    const form = await req.formData();
    pass = String(form.get("passcode") || form.get("password") || "");
    next = String(form.get("next") || "/admin");
  }

  if (!process.env.ADMIN_PASSCODE || pass !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json(
      { ok: false, error: "Invalid passcode" },
      { status: 401 },
    );
  }

  const dest = sanitizeNextPath(next);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  const res = NextResponse.redirect(new URL(dest, baseUrl), { status: 303 });
  setSignedCookie(res);
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing entry token" },
      { status: 400 },
    );
  }

  if (!process.env.ADMIN_ENTRY_TOKEN || token !== process.env.ADMIN_ENTRY_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Invalid entry token" },
      { status: 401 },
    );
  }

  const dest = sanitizeNextPath(searchParams.get("next") || "/admin");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  const res = NextResponse.redirect(new URL(dest, baseUrl), { status: 303 });
  setSignedCookie(res);
  return res;
}

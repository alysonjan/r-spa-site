// app/api/admin/promo-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");
const SITE_NAME = process.env.SITE_NAME || "Rejuvenessence";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    const result = await resend.emails.send({
      from: `${SITE_NAME} <noreply@rejuvenessence.org>`,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("[admin/promo-email] failed:", result.error);
      return NextResponse.json(
        { error: result.error.message || "Failed to send email" },
        { status: 500 }
      );
    }

    const messageId = result.data?.id;
    console.log("[admin/promo-email] sent to", to, "messageId:", messageId);

    return NextResponse.json({ success: true, messageId });
  } catch (e: any) {
    console.error("[admin/promo-email] error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to send promo email" },
      { status: 500 }
    );
  }
}

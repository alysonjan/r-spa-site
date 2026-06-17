// app/api/test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const data = await resend.emails.send({
      from: "Rejuvenessence <noreply@rejuvenessence.org>",
      // to: "liuchengxi0519@163.com",
      to: process.env.DEVELOPER_EMAIL || "",
      subject: "✅ Rejuvenessence Test Email",
      html: "<p>This is a test from the Rejuvenessence system.</p>",
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// app/api/email/class-reminder/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildEmailTemplate } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");

export async function POST(req: Request) {
  try {
    const { emails, class_type, class_date, start_time, end_time } = await req.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 });
    }

    if (!class_type || !class_date || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing class details" }, { status: 400 });
    }

    // 格式化课程类型（首字母大写）
    const formattedClassType = class_type.charAt(0).toUpperCase() + class_type.slice(1);

    // 格式化日期
    const dateObj = new Date(class_date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 批量发送邮件
    const emailPromises = emails.map(async (email: string) => {
      // 使用 buildEmailTemplate 生成邮件
      const { subject, html } = buildEmailTemplate("class_reminder", "there", {
        classType: formattedClassType,
        classDate: formattedDate,
        startTime: start_time,
        endTime: end_time,
      });

      return resend.emails.send({
        from: "Rejuvenessence <noreply@rejuvenessence.org>",
        to: email,
        subject,
        html,
      });
    });

    await Promise.all(emailPromises);

    return NextResponse.json({ 
      message: "Reminder emails sent successfully",
      count: emails.length 
    });
  } catch (error: any) {
    console.error("[email/class-reminder] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminder emails" },
      { status: 500 }
    );
  }
}

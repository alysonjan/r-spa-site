// lib/emails.ts — Zoho SMTP 版（专业 HTML 模板 + 真实地址 + logo）
/*
邮件追踪数据库表 SQL：

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  provider TEXT,
  status TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_outbox_created_idx ON email_outbox (created_at DESC);
CREATE INDEX IF NOT EXISTS email_outbox_to_email_idx ON email_outbox (to_email);
CREATE INDEX IF NOT EXISTS email_outbox_event_type_idx ON email_outbox (event_type);
*/

import nodemailer from "nodemailer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { makeICS } from "./ics";
import { Resend } from "resend";
import { buildEmailTemplate } from "./emailTemplates";
import { renderGiftPdfBuffer } from "./gift-pdf";
import { supabaseAdmin } from "./supabase/admin";
dayjs.extend(utc);
dayjs.extend(tz);

type BookingEmailParams = {
  service: string;
  startISO: string;
  endISO: string;
  name: string;
  email: string; // 客户邮箱
  phone: string;
  notes?: string;
};

// === 顶部常量：把这几行替换掉 ===
const TZ = process.env.TIMEZONE || "America/Toronto";
const SITE_NAME = process.env.SITE_NAME || "Rejuvenessence";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rejuvenessence.org";
const SITE_ADDRESS =
  process.env.SITE_ADDRESS || "281 Parkwood Ave, Keswick, ON L4P 2X4";
// 新增：展示用邮箱（页脚），默认回落到 SMTP 用户
const CONTACT_EMAIL =
  process.env.CONTACT_EMAIL ||
  process.env.ZOHO_SMTP_USER ||
  "booking@nesses.ca";

// 原来是硬编码 Rejuvenessence，这里改成跟 SITE_NAME 同步
const FROM_ADDR =
  process.env.ZOHO_FROM_EMAIL || `${SITE_NAME} <${process.env.ZOHO_SMTP_USER}>`;

// 线上默认不抄送；开发环境默认抄送，方便排查
const BCC_OWNER =
  (process.env.EMAIL_BCC_OWNER ??
    (process.env.NODE_ENV !== "production" ? "true" : "false")) === "true";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");

// =====================================================
// Existing Email Functions
// =====================================================

export async function sendDepositEmail(
  to: string,
  name: string,
  checkoutUrl: string,
): Promise<{ messageId?: string }> {
  const { subject, html } = buildEmailTemplate("deposit", name, {
    checkoutUrl,
  });

  const result = await sendEmailTracked({
    eventType: "deposit_link",
    to,
    subject,
    html,
    useFallback: true,
    meta: { name, checkoutUrl },
  });

  return { messageId: result.messageId };
}

export async function sendRefuseEmail(
  to: string,
  name: string,
  reason?: string,
) {
  const { subject, html } = buildEmailTemplate("refuse", name, { reason });

  await sendEmailTracked({
    eventType: "booking_refused",
    to,
    subject,
    html,
    useFallback: true,
    meta: { name, reason },
  });
}

export async function sendPaymentSuccessEmail(
  to: string,
  name: string,
  serviceName: string,
  time: string,
) {
  const { subject, html } = buildEmailTemplate("payment_success", name, {
    serviceName,
    time,
  });

  await sendEmailTracked({
    eventType: "payment_success",
    to,
    subject,
    html,
    useFallback: true,
    meta: { name, serviceName, time },
  });
}

function buildTransport() {
  const host = process.env.ZOHO_SMTP_HOST || "smtp.zohocloud.ca";
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const secure = port === 465; // 465=SSL, 587=STARTTLS

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.ZOHO_SMTP_USER!, // 如 michael@nesses.ca
      pass: process.env.ZOHO_SMTP_PASS!, // Zoho App Password（12位）
    },
  });
}

// =====================================================
// 统一邮件发送入口（带追踪）
// =====================================================

type SendEmailTrackedParams = {
  eventType: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
  bccOwner?: boolean;
  meta?: Record<string, any>;
  useFallback?: boolean; // 是否启用 Resend fallback
};

export async function sendEmailTracked(
  params: SendEmailTrackedParams
): Promise<{ messageId?: string; success: boolean }> {
  const {
    eventType,
    to,
    subject,
    html,
    text,
    attachments,
    replyTo,
    bccOwner,
    meta,
    useFallback = false,
  } = params;

  let provider = "zoho";
  let status = "queued";
  let messageId: string | undefined;
  let error: string | undefined;

  // 1. 默认用 Zoho SMTP 发送
  try {
    const transporter = buildTransport();
    const owner = process.env.RESEND_OWNER_EMAIL!;

    const mailOptions: any = {
      from: FROM_ADDR,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || process.env.ZOHO_SMTP_USER,
      envelope: {
        from: process.env.ZOHO_SMTP_USER!,
        to: [to],
      },
    };

    if (attachments) {
      mailOptions.attachments = attachments;
    }

    if (bccOwner) {
      mailOptions.bcc = owner;
      mailOptions.envelope.bcc = [owner];
    }

    const info = await transporter.sendMail(mailOptions);
    messageId = info.messageId;
    status = "sent";
    console.log(`[email][${eventType}] sent via Zoho to ${to}`);
  } catch (zohoError: any) {
    console.error(`[email][${eventType}] Zoho failed:`, zohoError.message);
    error = zohoError.message;
    status = "failed";

    // 2. Fallback to Resend if enabled
    if (useFallback && html) {
      try {
        provider = "resend";
        const result = await resend.emails.send({
          from: `${SITE_NAME} <noreply@rejuvenessence.org>`,
          to,
          subject,
          html,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        messageId = result.data?.id;
        status = "sent";
        error = undefined;
        console.log(`[email][${eventType}] sent via Resend to ${to}`);
      } catch (resendError: any) {
        console.error(
          `[email][${eventType}] Resend also failed:`,
          resendError.message
        );
        error = `Zoho: ${error}; Resend: ${resendError.message}`;
      }
    }
  }

  // 3. 写入 email_outbox（无论成功失败）
  try {
    await supabaseAdmin.from("email_outbox").insert({
      event_type: eventType,
      to_email: to,
      subject,
      provider,
      status,
      message_id: messageId || null,
      error: error || null,
      meta: meta || null,
    });
  } catch (dbError: any) {
    console.error(`[email][${eventType}] Failed to log to outbox:`, dbError);
    // 不要因为日志失败而影响业务
  }

  return { messageId, success: status === "sent" };
}

function fmtWhen(iso: string) {
  const d = dayjs(iso).tz(TZ);
  return `${d.format("ddd, MMM D, YYYY")} · ${d.format("h:mm A")} (${TZ})`;
}

function diffMin(aISO: string, bISO: string) {
  return Math.max(
    0,
    Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 60000),
  );
}

export async function sendBookingEmails(params: BookingEmailParams) {
  const owner = process.env.RESEND_OWNER_EMAIL!;
  const whenStr = fmtWhen(params.startISO);
  const durMin = diffMin(params.startISO, params.endISO);

  const meta = {
    booking_startISO: params.startISO,
    booking_endISO: params.endISO,
    service: params.service,
    customer_email: params.email,
  };

  // ===== 先发客户邮件（HTML + 纯文本 + .ics）=====
  try {
    const depositAmount = process.env.SECURITY_DEPOSIT_CAD || "75";
    const ics = makeICS(
      `${SITE_NAME} — ${params.service}`,
      `${SITE_NAME} session`,
      SITE_ADDRESS,
      params.startISO,
      params.endISO,
    );

    const customerText = `Hi ${params.name},

We've received your booking request! Here are the details:
Service:  ${params.service}
When:     ${whenStr} (${durMin} min)
Location: ${SITE_ADDRESS}

What's next
• Your request is currently pending approval.
• Once approved, we'll email you a secure payment link to pay a CA$${depositAmount} security deposit.
• After deposit payment, your appointment will be confirmed.
• The calendar invite (.ics) is attached.

Tip: Keep an eye on your inbox (and spam/junk) for the deposit email.

If you need to change the time, just reply to this email.

— ${SITE_NAME}
`;

    const logoUrl = `${SITE_URL}/logo.png`;
    const customerHtml = `
  <div style="background:#f6f7f9;padding:24px">
    <table role="presentation" cellspacing="0" cellpadding="0" align="center"
           style="width:100%;max-width:640px;background:#ffffff;border-radius:12px;
                  padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                  Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.6;">
      <tr>
        <td style="text-align:center;padding-bottom:12px">
          <img src="${logoUrl}" alt="${SITE_NAME}" width="96"
               style="display:inline-block;border-radius:8px"/>
        </td>
      </tr>
      <tr>
        <td>
          <h2 style="margin:0 0 8px;font-weight:600;font-size:20px">Hi ${params.name},</h2>
          <p style="margin:0 0 16px">We've received your booking request! Here are the details:</p>

          <table role="presentation" cellspacing="0" cellpadding="0"
                 style="width:100%;border:1px solid #e5e7eb;border-radius:8px;
                        padding:12px;background:#fafafa">
            <tr>
              <td style="width:120px;color:#6b7280;padding:4px 8px">Service</td>
              <td style="padding:4px 8px;font-weight:600">${params.service}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:4px 8px">When</td>
              <td style="padding:4px 8px">${whenStr} <span style="color:#6b7280">(${durMin} min)</span></td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:4px 8px">Location</td>
              <td style="padding:4px 8px">${SITE_ADDRESS}</td>
            </tr>
          </table>

          <div style="margin:20px 0;padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px">
            <p style="margin:0;font-weight:600;color:#92400e">⏳ Request Pending Approval</p>
          </div>

          <h3 style="margin:20px 0 8px;font-size:16px">What's next</h3>
          <ul style="margin:0 0 16px;padding-left:20px">
            <li>Your request is currently <strong>pending approval</strong>.</li>
            <li>Once approved, we'll email you a secure payment link to pay a <strong>CA$${depositAmount} security deposit</strong>.</li>
            <li>After deposit payment, your appointment will be confirmed.</li>
            <li>The iCalendar (.ics) file is attached — you can add it to your calendar now.</li>
          </ul>

          <p style="margin:0 0 8px;padding:8px;background:#f0f9ff;border-left:3px solid #0ea5e9;border-radius:4px;font-size:14px;color:#0c4a6e">
            <strong>💡 Tip:</strong> Keep an eye on your inbox (and spam/junk folder) for the deposit email.
          </p>

          <p style="margin:16px 0 16px">If you need to change the time, just reply to this email.</p>

          <p style="margin:24px 0 0;color:#6b7280;font-size:14px">— ${SITE_NAME}</p>
        </td>
      </tr>

      <tr>
        <td style="padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">
          ${SITE_NAME} · ${SITE_ADDRESS} ·
          <a href="mailto:${CONTACT_EMAIL}"
             style="color:#6b7280;text-decoration:underline">${CONTACT_EMAIL}</a>
        </td>
      </tr>
    </table>
  </div>
  `;

    await sendEmailTracked({
      eventType: "booking_request",
      to: params.email,
      subject: `Booking request received — deposit required to confirm`,
      text: customerText,
      html: customerHtml,
      attachments: [
        {
          filename: "appointment.ics",
          content: Buffer.from(ics),
          contentType: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ],
      bccOwner: BCC_OWNER,
      meta,
    });
  } catch (customerEmailError: any) {
    console.error("[email] Customer email failed:", customerEmailError);
    // 客户邮件失败不影响店家邮件
  }

  // ===== 再发店家邮件（纯文本，不带附件）=====
  try {
    const ownerText = [
      `New booking request`,
      ``,
      `Service:  ${params.service}`,
      `When:     ${whenStr}  (${durMin} min)`,
      ``,
      `Client:   ${params.name}`,
      `Email:    ${params.email}`,
      `Phone:    ${params.phone}`,
      `Notes:    ${params.notes || "-"}`,
      ``,
      `Tips:`,
      `- Reply to this email to contact the client directly (reply-to set).`,
    ].join("\n");

    await sendEmailTracked({
      eventType: "booking_request_owner",
      to: owner,
      subject: `New booking · ${params.service} · ${whenStr} · ${params.name}`,
      text: ownerText,
      replyTo: `${params.name} <${params.email}>`,
      meta,
    });
  } catch (ownerEmailError: any) {
    console.error("[email] Owner email failed:", ownerEmailError);
    // 店家邮件失败不影响业务
  }
}

// =====================================================
// Gift Card Email Functions
// =====================================================

/**
 * Send gift card email to recipient (either buyer or gift recipient)
 */
export async function sendGiftCardEmail(params: {
  code: string;
  token: string;
  amount: number;
  recipientEmail: string;
  recipientName?: string | null;
  senderName?: string | null;
  message?: string | null;
  isGift: boolean;
  expiresAt?: string | null;
  purchasedAt?: string;
}) {
  const {
    code,
    token,
    amount,
    recipientEmail,
    recipientName,
    senderName,
    message,
    isGift,
    expiresAt,
    purchasedAt,
  } = params;

  // Format amount
  const amountFormatted = `$${amount.toFixed(2)} CAD`;

  // Build redeem URL
  const redeemUrl = `${SITE_URL}/redeem/${token}`;

  // Build email template
  const { subject, html } = buildEmailTemplate(
    "gift_card_recipient",
    recipientName || "there",
    {
      code,
      amount: amountFormatted,
      senderName: senderName || undefined,
      recipientName: recipientName || undefined,
      message: message || undefined,
      redeemUrl,
      isGift,
    },
  );

  // Generate PDF attachment
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await renderGiftPdfBuffer({
      value: amount,
      code,
      recipient: recipientName,
      sender: senderName,
      message,
      expiresAt,
      purchasedAt,
      isGift,
    });
    console.log(`[email] PDF generated for gift card ${code}`);
  } catch (error: any) {
    console.error(`[email] Failed to generate PDF for ${code}:`, error);
    // Continue without PDF - email is more important
  }

  // Send via Zoho SMTP (more reliable delivery)
  try {
    const transporter = buildTransport();

    await transporter.sendMail({
      from: FROM_ADDR,
      to: recipientEmail,
      subject,
      html,
      replyTo: process.env.ZOHO_SMTP_USER,
      attachments: pdfBuffer
        ? [
            {
              filename: `Rejuvenessence-Gift-Card-${code}.pdf`,
              content: pdfBuffer,
            },
          ]
        : undefined,
      envelope: {
        from: process.env.ZOHO_SMTP_USER!,
        to: [recipientEmail],
      },
    });

    console.log(
      `[email] Gift card sent to ${recipientEmail}${pdfBuffer ? " with PDF" : " (no PDF)"}`,
    );
  } catch (error: any) {
    console.error(`[email] Failed to send gift card email:`, error);
    throw error;
  }
}

/**
 * Send purchase confirmation to buyer
 */
export async function sendGiftCardPurchaseConfirmation(params: {
  senderEmail: string;
  senderName: string;
  totalAmount: number;
  cards: Array<{
    code: string;
    amount: number;
    isGift: boolean;
    recipientEmail: string;
  }>;
}) {
  const { senderEmail, senderName, totalAmount, cards } = params;

  // Format total amount
  const totalFormatted = `$${totalAmount.toFixed(2)} CAD`;

  // Build email template
  const { subject, html } = buildEmailTemplate(
    "gift_card_purchase_confirm",
    senderName,
    {
      senderName,
      totalAmount: totalFormatted,
      cardCount: cards.length,
      cards,
    },
  );

  // Send via Zoho SMTP (more reliable delivery)
  const transporter = buildTransport();

  // Send to buyer
  try {
    await transporter.sendMail({
      from: FROM_ADDR,
      to: senderEmail,
      subject,
      html,
      replyTo: process.env.ZOHO_SMTP_USER,
      envelope: {
        from: process.env.ZOHO_SMTP_USER!,
        to: [senderEmail],
      },
    });

    console.log(`[email] Purchase confirmation sent to ${senderEmail}`);
  } catch (error: any) {
    console.error(`[email] Failed to send purchase confirmation:`, error);
    throw error;
  }

  // Also notify owner via Zoho
  try {
    const owner = process.env.RESEND_OWNER_EMAIL!;

    const giftsCount = cards.filter((c) => c.isGift).length;
    const selfCount = cards.length - giftsCount;

    const ownerText = [
      `New Gift Card Purchase`,
      ``,
      `Buyer:        ${senderName} (${senderEmail})`,
      `Total:        $${totalAmount.toFixed(2)} CAD`,
      `Cards:        ${cards.length}`,
      `For self:     ${selfCount}`,
      `As gifts:     ${giftsCount}`,
      ``,
      `Details:`,
      ...cards.map(
        (card, i) =>
          `${i + 1}. ${card.code} - $${card.amount} - ${card.isGift ? `Gift to ${card.recipientEmail}` : "For buyer"}`,
      ),
      ``,
      `All gift cards have been sent to recipients.`,
    ].join("\n");

    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.ZOHO_SMTP_USER}>`,
      to: owner,
      subject: `Gift Card Purchase - ${senderName} - $${totalAmount.toFixed(2)}`,
      text: ownerText,
      replyTo: `${senderName} <${senderEmail}>`,
      envelope: {
        from: process.env.ZOHO_SMTP_USER!,
        to: [owner],
      },
    });

    console.log(`[email] Owner notification sent`);
  } catch (error: any) {
    console.error(`[email] Failed to send owner notification:`, error);
    // Don't throw - customer email is more important
  }
}
export async function sendGiftCardUseNotification(params: {
  giftCard: any;
  amountUsed: number;
  newBalance: number;
  serviceName: string;
}) {
  const { giftCard, amountUsed, newBalance, serviceName } = params;

  // Determine who to notify
  const notifyEmail =
    giftCard.is_gift && giftCard.recipient_email
      ? giftCard.recipient_email
      : giftCard.sender_email || giftCard.purchased_by_email;

  if (!notifyEmail) {
    console.log("[email] No email to notify for gift card use");
    return;
  }

  const notifyName =
    giftCard.is_gift && giftCard.recipient_name
      ? giftCard.recipient_name
      : giftCard.sender_name || "there";

  // Format amounts
  const amountUsedFormatted = `$${(amountUsed / 100).toFixed(2)}`;
  const newBalanceFormatted = `$${(newBalance / 100).toFixed(2)}`;

  // Build email - 简洁单色模板（黑白灰）
  const subject = `Gift Card Used - ${amountUsedFormatted}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f6f7f9; padding:24px;">
      <table align="center" style="max-width:600px; background:#fff; padding:24px; border-radius:12px; border:1px solid #e5e7eb;">
        <tr>
          <td>
            <div style="text-align:center; padding-bottom:16px;">
              <img src="${SITE_URL}/logo.png" width="96" style="border-radius:8px;" />
            </div>

            <h2 style="margin:0 0 8px; font-weight:600; font-size:20px; color:#111;">Hi ${notifyName},</h2>
            <p style="margin:0 0 24px; color:#6b7280;">A transaction was processed on your gift card.</p>

            <div style="background:#fafafa; border:1px solid #e5e7eb; border-radius:8px; padding:20px; margin:24px 0;">
              <table style="width:100%;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Amount Used:</td>
                  <td style="padding:8px 0; font-weight:700; font-size:24px; text-align:right; color:#111;">
                    ${amountUsedFormatted}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Service:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${serviceName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Date:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${new Date().toLocaleDateString()}</td>
                </tr>
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 0 0; color:#374151; font-weight:600;">Remaining Balance:</td>
                  <td style="padding:12px 0 0; font-size:20px; font-weight:700; text-align:right; color:#111;">
                    ${newBalanceFormatted}
                  </td>
                </tr>
              </table>
            </div>

            <p style="color:#6b7280; font-size:14px; margin:24px 0 0;">
              Thank you for choosing ${SITE_NAME}!
            </p>

            <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0"/>
            <p style="font-size:12px; color:#6b7280;">
              ${SITE_NAME} · ${SITE_ADDRESS} ·
              <a href="mailto:${CONTACT_EMAIL}" style="color:#6b7280; text-decoration:underline">
                ${CONTACT_EMAIL}
              </a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendEmailTracked({
    eventType: "giftcard_use",
    to: notifyEmail,
    subject,
    html,
    useFallback: false,
    meta: {
      gift_card_code: giftCard.code,
      amount_used: amountUsed,
      new_balance: newBalance,
      service_name: serviceName,
    },
  });
}

// =====================================================
// Package Purchase Email Functions
// =====================================================

/**
 * Send package purchase confirmation email to buyer
 */
export async function sendPackagePurchaseBuyerEmail(params: {
  buyerEmail: string;
  buyerName: string;
  packageName: string;
  packageCode: string;
  amountCents: number;
  purchasedAt: string;
  isGift: boolean;
  recipientEmail?: string | null;
}) {
  const {
    buyerEmail,
    buyerName,
    packageName,
    packageCode,
    amountCents,
    purchasedAt,
    isGift,
    recipientEmail,
  } = params;

  const amountFormatted = `CA$${(amountCents / 100).toFixed(0)}`;
  const purchaseDate = new Date(purchasedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = "Your Holiday Package Purchase Confirmation";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f6f7f9; padding:24px;">
      <table align="center" style="max-width:600px; background:#fff; padding:32px; border-radius:12px; border:1px solid #e5e7eb;">
        <tr>
          <td>
            <div style="text-align:center; padding-bottom:24px;">
              <img src="${SITE_URL}/logo.png" width="96" style="border-radius:8px;" />
            </div>

            <h1 style="margin:0 0 8px; font-weight:700; font-size:28px; color:#111; text-align:center;">Purchase Confirmed!</h1>
            <p style="margin:0 0 32px; color:#6b7280; text-align:center; font-size:16px;">Thank you for your purchase${isGift ? " of a gift package" : ""}.</p>

            <div style="background:#fafafa; border:1px solid #e5e7eb; border-radius:8px; padding:24px; margin:24px 0;">
              <h2 style="margin:0 0 16px; font-size:20px; font-weight:600; color:#111;">${packageName}</h2>
              <table style="width:100%;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Package Code:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${packageCode}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Amount Paid:</td>
                  <td style="padding:8px 0; font-weight:700; font-size:20px; text-align:right; color:#111;">${amountFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Purchase Date:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${purchaseDate}</td>
                </tr>
                ${isGift && recipientEmail ? `
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Gift Sent To:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${recipientEmail}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            ${isGift ? `
            <div style="background:#f0f9ff; border-left:4px solid #0ea5e9; border-radius:4px; padding:16px; margin:24px 0;">
              <p style="margin:0; color:#0c4a6e; font-size:14px;">
                <strong>🎁 Gift Package:</strong> ${recipientEmail ? `We've sent a notification to ${recipientEmail} about their gift!` : "The recipient will be notified about their gift."}
              </p>
            </div>
            ` : ""}

            <div style="text-align:center; margin:32px 0;">
              <a href="${SITE_URL}/booking" style="display:inline-block; background:#111; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px; margin:0 8px 8px;">
                Book Your Appointment
              </a>
              <br/>
              <a href="${SITE_URL}/account" style="display:inline-block; color:#111; padding:14px 32px; text-decoration:none; font-weight:600; font-size:16px; margin:8px;">
                View My Account
              </a>
            </div>

            <p style="color:#6b7280; font-size:14px; margin:24px 0 0; text-align:center;">
              Questions? <a href="${SITE_URL}/#contact" style="color:#111; text-decoration:underline;">Contact us</a>
            </p>

            <hr style="border:none; border-top:1px solid #e5e7eb; margin:32px 0"/>
            <p style="font-size:12px; color:#6b7280; text-align:center;">
              ${SITE_NAME} · ${SITE_ADDRESS} ·
              <a href="mailto:${CONTACT_EMAIL}" style="color:#6b7280; text-decoration:underline;">
                ${CONTACT_EMAIL}
              </a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendEmailTracked({
    eventType: "package_purchase_buyer",
    to: buyerEmail,
    subject,
    html,
    useFallback: true,
    meta: {
      package_code: packageCode,
      package_name: packageName,
      amount_cents: amountCents,
      is_gift: isGift,
      recipient_email: recipientEmail,
    },
  });
}

/**
 * Send package gift notification email to recipient
 */
export async function sendPackageGiftRecipientEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  packageName: string;
  packageCode: string;
  amountCents: number;
  giftMessage?: string | null;
}) {
  const {
    recipientEmail,
    recipientName,
    senderName,
    packageName,
    packageCode,
    amountCents,
    giftMessage,
  } = params;

  const amountFormatted = `CA$${(amountCents / 100).toFixed(0)}`;
  const subject = "You've received a Holiday Package Gift";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f6f7f9; padding:24px;">
      <table align="center" style="max-width:600px; background:#fff; padding:32px; border-radius:12px; border:1px solid #e5e7eb;">
        <tr>
          <td>
            <div style="text-align:center; padding-bottom:24px;">
              <img src="${SITE_URL}/logo.png" width="96" style="border-radius:8px;" />
            </div>

            <div style="text-align:center; margin-bottom:32px;">
              <div style="font-size:48px; margin-bottom:16px;">🎁</div>
              <h1 style="margin:0 0 8px; font-weight:700; font-size:28px; color:#111;">You've Received a Gift!</h1>
              <p style="margin:0; color:#6b7280; font-size:16px;">
                ${senderName} has sent you a holiday package
              </p>
            </div>

            ${giftMessage ? `
            <div style="background:#fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:16px; margin:24px 0;">
              <p style="margin:0 0 8px; color:#92400e; font-weight:600; font-size:14px;">Personal Message:</p>
              <p style="margin:0; color:#78350f; font-size:14px; font-style:italic;">"${giftMessage}"</p>
            </div>
            ` : ""}

            <div style="background:#fafafa; border:1px solid #e5e7eb; border-radius:8px; padding:24px; margin:24px 0;">
              <h2 style="margin:0 0 16px; font-size:20px; font-weight:600; color:#111;">${packageName}</h2>
              <table style="width:100%;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Package Code:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${packageCode}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">Value:</td>
                  <td style="padding:8px 0; font-weight:700; font-size:20px; text-align:right; color:#111;">${amountFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280; font-size:14px;">From:</td>
                  <td style="padding:8px 0; font-weight:600; text-align:right; color:#111;">${senderName}</td>
                </tr>
              </table>
            </div>

            <div style="background:#f0f9ff; border-left:4px solid #0ea5e9; border-radius:4px; padding:16px; margin:24px 0;">
              <p style="margin:0; color:#0c4a6e; font-size:14px;">
                <strong>Next Steps:</strong> This package is ready for you to use! Book your appointment at your convenience.
              </p>
            </div>

            <div style="text-align:center; margin:32px 0;">
              <a href="${SITE_URL}/booking" style="display:inline-block; background:#111; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                Book My Appointment
              </a>
            </div>

            <p style="color:#6b7280; font-size:14px; margin:24px 0 0; text-align:center;">
              Questions? <a href="${SITE_URL}/#contact" style="color:#111; text-decoration:underline;">Contact us</a>
            </p>

            <hr style="border:none; border-top:1px solid #e5e7eb; margin:32px 0"/>
            <p style="font-size:12px; color:#6b7280; text-align:center;">
              ${SITE_NAME} · ${SITE_ADDRESS} ·
              <a href="mailto:${CONTACT_EMAIL}" style="color:#6b7280; text-decoration:underline;">
                ${CONTACT_EMAIL}
              </a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendEmailTracked({
    eventType: "package_gift_recipient",
    to: recipientEmail,
    subject,
    html,
    useFallback: true,
    meta: {
      package_code: packageCode,
      package_name: packageName,
      amount_cents: amountCents,
      sender_name: senderName,
      recipient_name: recipientName,
      gift_message: giftMessage,
    },
  });
}

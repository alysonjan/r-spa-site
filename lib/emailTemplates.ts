// lib/emailTemplates.ts
export type EmailTemplateType = 
  | "deposit" 
  | "refuse" 
  | "payment_success" 
  | "class_reminder"
  | "gift_card_recipient"        
  | "gift_card_purchase_confirm"
  | "donation_receipt"; 

export function buildEmailTemplate(
  type: EmailTemplateType,
  name: string,
  data: { 
    checkoutUrl?: string; 
    reason?: string; 
    serviceName?: string; 
    time?: string;
    classType?: string;
    classDate?: string;
    startTime?: string;
    endTime?: string;
    // Gift card specific fields
    code?: string;
    amount?: string;
    senderName?: string;
    recipientName?: string;
    message?: string;
    redeemUrl?: string;
    isGift?: boolean;
    totalAmount?: string;
    cardCount?: number;
    cards?: Array<{
      code: string;
      amount: number;
      isGift: boolean;
      recipientEmail: string;
    }>;
    // Donation specific fields
    transactionId?: string;
    date?: string;
  }
) {
  const SITE_NAME = "Rejuvenessence";
  const SITE_ADDRESS = "281 Parkwood Ave, Keswick, ON L4P 2X4";
  const CONTACT_EMAIL = "booking@nesses.ca";
  const logoUrl = "https://rejuvenessence.org/logo.png";

  const commonHeader = `
    <div style="font-family:system-ui, sans-serif; background:#f6f7f9; padding:24px;">
      <table align="center" style="max-width:600px; background:#fff; padding:24px; border-radius:12px;">
        <tr>
          <td align="center">
            <img src="${logoUrl}" width="96" style="border-radius:8px;" />
            <h2 style="margin-top:16px;">Hi ${name},</h2>
  `;

  const commonFooter = `
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:12px;color:#999;">
              ${SITE_NAME} · ${SITE_ADDRESS} ·
              <a href="mailto:${CONTACT_EMAIL}" style="color:#999;text-decoration:underline">
                ${CONTACT_EMAIL}
              </a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  // 💰 Deposit email
  if (type === "deposit") {
    const { checkoutUrl } = data;
    const depositAmount = process.env.SECURITY_DEPOSIT_CAD || '75';
    return {
      subject: "Confirm your booking with deposit",
      html: `
        ${commonHeader}
        <p>Your appointment has been approved! Please confirm your booking by paying the deposit below:</p>
        <p style="text-align:center; margin:32px 0;">
          <a href="${checkoutUrl}"
            style="background:#10b981; color:#fff; padding:14px 28px;
            border-radius:8px; text-decoration:none; font-weight:600;">
            Pay CA$${depositAmount} Deposit
          </a>
        </p>
        <p style="color:#666;">This deposit is refundable up to 48h before your appointment.</p>
        <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  // 🚫 Refuse email
  if (type === "refuse") {
    const { reason } = data;
    return {
      subject: "Booking Update — Request Unavailable",
      html: `
        ${commonHeader}
        <p>Thank you for your interest in <strong>${SITE_NAME}</strong>.</p>
        <p>Unfortunately, we're unable to accommodate your requested time.</p>
        ${
          reason
            ? `<p style="color:#444;margin:12px 0;"><b>Reason:</b> ${reason}</p>`
            : ""
        }
        <p>You can choose another available time:</p>
        <p style="text-align:center; margin:24px 0;">
          <a href="https://rejuvenessence.org/booking"
            style="background:#e11d48; color:#fff; padding:12px 24px;
            border-radius:8px; text-decoration:none; font-weight:600;">
            Book Another Time
          </a>
        </p>
        <p style="margin-top:24px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  // ✅ Payment Success email
  if (type === "payment_success") {
    const { serviceName, time } = data;
    return {
      subject: "Your booking is confirmed 🎉",
      html: `
        ${commonHeader}
        <p>Thank you for completing your deposit payment!</p>
        <p>Your booking is now <strong>confirmed</strong>.</p>
        ${
          serviceName
            ? `<p style="margin:12px 0 4px;font-weight:600;">Service:</p><p>${serviceName}</p>`
            : ""
        }
        ${
          time
            ? `<p style="margin:12px 0 4px;font-weight:600;">Time:</p><p>${time}</p>`
            : ""
        }
        <p style="margin:24px 0 8px;">We look forward to seeing you soon at:</p>
        <p style="font-weight:500;">${SITE_ADDRESS}</p>
        <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  // 🔔 Class Reminder email
  if (type === "class_reminder") {
    const { classType, classDate, startTime, endTime } = data;
    return {
      subject: `Reminder: ${classType} class tomorrow`,
      html: `
        ${commonHeader}
        <p>This is a friendly reminder about your upcoming class! 👋</p>
        
        <div style="background:#f9fafb; padding:20px; border-radius:8px; border-left:4px solid #8b5cf6; margin:24px 0;">
          <p style="margin:0 0 12px; font-size:18px; font-weight:600; color:#8b5cf6;">
            ${classType}
          </p>
          <p style="margin:0 0 8px; color:#374151;">
            <strong>📅 Date:</strong> ${classDate}
          </p>
          <p style="margin:0 0 8px; color:#374151;">
            <strong>🕐 Time:</strong> ${startTime} - ${endTime}
          </p>
          <p style="margin:0; color:#374151;">
            <strong>📍 Location:</strong> ${SITE_ADDRESS}
          </p>
        </div>
        
        <p style="margin:20px 0 8px; font-weight:600;">Please arrive 5-10 minutes early.</p>
        
        <p style="font-size:14px; color:#6b7280; margin:16px 0 8px;">Don't forget to bring:</p>
        <ul style="color:#6b7280; font-size:14px; margin:0; padding-left:20px;">
          <li style="margin-bottom:6px;">Comfortable workout clothes</li>
          <li style="margin-bottom:6px;">Water bottle</li>
          <li style="margin-bottom:6px;">Yoga mat (if you have one)</li>
        </ul>
        
        <p style="margin-top:24px; color:#374151;">We look forward to seeing you!</p>
        <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  // 🎁 Gift Card - Recipient Email
  if (type === "gift_card_recipient") {
    const { 
      code, 
      amount, 
      senderName, 
      message, 
      redeemUrl, 
      isGift 
    } = data;

    // Scenario A: For themselves (not a gift)
    if (!isGift) {
      return {
        subject: `Your ${amount} Gift Card is Ready! 🎁`,
        html: `
          ${commonHeader}
          <div style="text-align:center; margin:32px 0;">
            <div style="display:inline-block; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        padding:32px; border-radius:16px; color:white;">
              <div style="font-size:18px; opacity:0.9; margin-bottom:8px;">Gift Card Value</div>
              <div style="font-size:48px; font-weight:700;">${amount}</div>
              <div style="font-size:14px; opacity:0.8; margin-top:8px;">Valid for 2 years</div>
            </div>
          </div>

          <div style="background:#f9fafb; padding:20px; border-radius:12px; margin:24px 0;">
            <div style="font-weight:600; margin-bottom:12px;">Gift Card Code:</div>
            <div style="font-size:24px; font-weight:700; color:#667eea; letter-spacing:2px; font-family:monospace;">
              ${code}
            </div>
          </div>

          <div style="margin:32px 0;">
            <h3 style="font-size:18px; margin-bottom:16px;">How to Use Your Gift Card:</h3>
            
            <div style="background:#fff; border:2px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:16px;">
              <div style="font-weight:600; color:#667eea; margin-bottom:8px;">Option 1: Use Online</div>
              <p style="margin:0 0 12px; color:#6b7280;">Add funds to your wallet and use for online bookings:</p>
              <p style="text-align:center; margin:16px 0;">
                <a href="${redeemUrl}" 
                  style="background:#667eea; color:#fff; padding:12px 24px;
                  border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
                  Redeem to Wallet →
                </a>
              </p>
            </div>

            <div style="background:#fff; border:2px solid #e5e7eb; border-radius:12px; padding:20px;">
              <div style="font-weight:600; color:#10b981; margin-bottom:8px;">Option 2: Use In-Store</div>
              <p style="margin:0; color:#6b7280;">
                Show this email or the attached PDF to staff at our location. 
                Your gift card can be used for any of our services.
              </p>
            </div>
          </div>

          <div style="background:#fef3c7; border:2px solid #fbbf24; border-radius:12px; padding:16px; margin:24px 0;">
            <div style="display:flex; align-items:start; gap:12px;">
              <div style="font-size:24px;">💡</div>
              <div style="flex:1;">
                <div style="font-weight:600; color:#92400e; margin-bottom:4px;">Pro Tip</div>
                <div style="color:#92400e; font-size:14px;">
                  Redeem to your wallet now for the easiest booking experience! 
                  You can use your balance anytime, and it never expires.
                </div>
              </div>
            </div>
          </div>

          <div style="text-align:center; margin:32px 0; padding-top:24px; border-top:1px solid #e5e7eb;">
            <p style="color:#6b7280; font-size:14px; margin:0 0 12px;">Visit us at:</p>
            <p style="font-weight:600; margin:0 0 8px;">${SITE_ADDRESS}</p>
            <p style="margin:0;">
              <a href="https://rejuvenessence.org/booking" 
                style="color:#667eea; text-decoration:underline;">Book Now →</a>
            </p>
          </div>

          <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
          ${commonFooter}
        `,
      };
    }

    // Scenario B: It's a gift
    return {
      subject: `${senderName} sent you a ${amount} gift card! 🎁`,
      html: `
        ${commonHeader}
        <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding:32px; border-radius:16px; color:white; text-align:center; margin:24px 0;">
          <div style="font-size:48px; margin-bottom:16px;">🎁</div>
          <div style="font-size:24px; font-weight:600; margin-bottom:8px;">
            ${senderName} sent you a gift!
          </div>
          <div style="font-size:48px; font-weight:700; margin:16px 0;">${amount}</div>
          <div style="font-size:16px; opacity:0.9;">
            Rejuvenessence Gift Card
          </div>
        </div>

        ${message ? `
          <div style="background:#f9fafb; border-left:4px solid #667eea; padding:20px; border-radius:8px; margin:24px 0;">
            <div style="font-size:14px; color:#6b7280; margin-bottom:8px;">Personal Message:</div>
            <div style="font-style:italic; color:#374151; line-height:1.6;">
              "${message}"
            </div>
            <div style="text-align:right; margin-top:12px; color:#6b7280; font-size:14px;">
              — ${senderName}
            </div>
          </div>
        ` : ''}

        <div style="background:#f9fafb; padding:20px; border-radius:12px; margin:24px 0;">
          <div style="font-weight:600; margin-bottom:12px;">Your Gift Card Code:</div>
          <div style="font-size:24px; font-weight:700; color:#667eea; letter-spacing:2px; font-family:monospace;">
            ${code}
          </div>
        </div>

        <div style="margin:32px 0;">
          <h3 style="font-size:18px; margin-bottom:16px;">How to Use Your Gift:</h3>
          
          <div style="background:#fff; border:2px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:16px;">
            <div style="font-weight:600; color:#667eea; margin-bottom:8px;">Option 1: Use Online</div>
            <p style="margin:0 0 12px; color:#6b7280;">Redeem to your wallet and book online:</p>
            <p style="text-align:center; margin:16px 0;">
              <a href="${redeemUrl}" 
                style="background:#667eea; color:#fff; padding:12px 24px;
                border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
                Redeem Now →
              </a>
            </p>
          </div>

          <div style="background:#fff; border:2px solid #e5e7eb; border-radius:12px; padding:20px;">
            <div style="font-weight:600; color:#10b981; margin-bottom:8px;">Option 2: Use In-Store</div>
            <p style="margin:0; color:#6b7280;">
              Bring this email or the attached PDF to: <strong>${SITE_ADDRESS}</strong>
            </p>
          </div>
        </div>

        <div style="text-align:center; margin:32px 0; padding:24px; background:#fef3c7; border-radius:12px;">
          <div style="font-size:18px; font-weight:600; color:#92400e; margin-bottom:8px;">
            Treat Yourself!
          </div>
          <p style="color:#92400e; margin:0;">
            Explore our services and book your relaxation session today.
          </p>
          <p style="margin:16px 0 0;">
            <a href="https://rejuvenessence.org/booking" 
              style="color:#92400e; text-decoration:underline; font-weight:600;">Browse Services →</a>
          </p>
        </div>

        <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  // 📧 Gift Card Purchase Confirmation
  if (type === "gift_card_purchase_confirm") {
    const { 
      senderName, 
      totalAmount, 
      cardCount,
      cards 
    } = data;

    const giftsCount = cards?.filter(c => c.isGift).length || 0;
    const selfCount = (cardCount || 0) - giftsCount;

    return {
      subject: `Gift Card Purchase Confirmed - ${totalAmount} 🎉`,
      html: `
        ${commonHeader}
        <div style="text-align:center; margin:32px 0;">
          <div style="font-size:48px; margin-bottom:16px;">✅</div>
          <h2 style="color:#10b981; margin:0 0 8px;">Purchase Confirmed!</h2>
          <p style="color:#6b7280; margin:0;">Thank you for your purchase, ${senderName}</p>
        </div>

        <div style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    padding:24px; border-radius:12px; color:white; margin:24px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:14px; opacity:0.9; margin-bottom:4px;">Total Amount</div>
              <div style="font-size:36px; font-weight:700;">${totalAmount}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px; opacity:0.9; margin-bottom:4px;">Gift Cards</div>
              <div style="font-size:36px; font-weight:700;">${cardCount}</div>
            </div>
          </div>
        </div>

        <div style="margin:24px 0;">
          <h3 style="font-size:18px; margin-bottom:16px;">Purchase Summary:</h3>
          
          ${selfCount > 0 ? `
            <div style="background:#f9fafb; border-radius:12px; padding:16px; margin-bottom:12px;">
              <div style="font-weight:600; color:#374151; margin-bottom:8px;">
                For Yourself: ${selfCount} card${selfCount > 1 ? 's' : ''}
              </div>
              <p style="margin:0; color:#6b7280; font-size:14px;">
                Gift cards sent to: ${senderName}
              </p>
            </div>
          ` : ''}

          ${giftsCount > 0 ? `
            <div style="background:#fef3c7; border-radius:12px; padding:16px;">
              <div style="font-weight:600; color:#92400e; margin-bottom:12px;">
                Gifts Sent: ${giftsCount} card${giftsCount > 1 ? 's' : ''}
              </div>
              ${cards?.filter(c => c.isGift).map(card => `
                <div style="padding:8px 0; border-bottom:1px solid #fbbf24;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <div style="font-weight:600; color:#92400e;">$${card.amount}</div>
                      <div style="font-size:12px; color:#92400e;">To: ${card.recipientEmail}</div>
                    </div>
                    <div style="font-family:monospace; font-size:12px; color:#92400e;">
                      ${card.code}
                    </div>
                  </div>
                </div>
              `).join('') || ''}
            </div>
          ` : ''}
        </div>

        <div style="background:#e0f2fe; border:2px solid #0ea5e9; border-radius:12px; padding:20px; margin:24px 0;">
          <div style="display:flex; align-items:start; gap:12px;">
            <div style="font-size:24px;">ℹ️</div>
            <div style="flex:1;">
              <div style="font-weight:600; color:#0c4a6e; margin-bottom:8px;">What Happens Next?</div>
              <ul style="margin:0; padding-left:20px; color:#0c4a6e; font-size:14px;">
                ${selfCount > 0 ? '<li style="margin-bottom:6px;">Your gift cards have been sent to your email</li>' : ''}
                ${giftsCount > 0 ? '<li style="margin-bottom:6px;">Gift recipients will receive their cards via email</li>' : ''}
                <li style="margin-bottom:6px;">All gift cards are valid for 2 years</li>
                <li>Can be used online or in-store</li>
              </ul>
            </div>
          </div>
        </div>

        <div style="text-align:center; margin:32px 0;">
          <p style="color:#6b7280; margin:0 0 12px;">Need help?</p>
          <p style="margin:0;">
            <a href="mailto:${CONTACT_EMAIL}" 
              style="color:#667eea; text-decoration:underline;">Contact Support</a>
          </p>
        </div>

        <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  // 🧾 Donation Receipt Email
  if (type === "donation_receipt") {
    const { amount, transactionId, date } = data;
    return {
      subject: `Thank you for your donation! 💖`,
      html: `
        ${commonHeader}
        <div style="text-align:center; margin:32px 0;">
          <div style="font-size:48px; margin-bottom:16px;">💖</div>
          <h2 style="color:#db2777; margin:0 0 8px;">Thank You!</h2>
          <p style="color:#6b7280; margin:0; line-height: 1.5;">
            Your generous contribution helps us continue providing exceptional services and meals.<br />
            We truly appreciate your support.
          </p>
        </div>

        <div style="background:#fdf2f8; border:2px solid #fbcfe8; padding:24px; border-radius:12px; margin:24px 0;">
          <h3 style="font-size:18px; color:#9d174d; margin:0 0 16px; text-align:center;">Donation Receipt</h3>
          
          <table width="100%" style="font-size:15px; color:#374151;">
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #fbcfe8;"><strong>Donor:</strong></td>
              <td style="padding:8px 0; border-bottom:1px solid #fbcfe8; text-align:right;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #fbcfe8;"><strong>Amount:</strong></td>
              <td style="padding:8px 0; border-bottom:1px solid #fbcfe8; text-align:right; font-weight:700; color:#db2777;">$${amount}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #fbcfe8;"><strong>Date:</strong></td>
              <td style="padding:8px 0; border-bottom:1px solid #fbcfe8; text-align:right;">${date}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Transaction ID:</strong></td>
              <td style="padding:8px 0; text-align:right; font-family:monospace; font-size:13px; color:#6b7280;">${transactionId}</td>
            </tr>
          </table>
        </div>

        <div style="text-align:center; margin:32px 0;">
          <p style="color:#6b7280; font-size:13px; margin:0;">
            * This receipt is for your records. Please note that as a private business, donations are not tax-deductible.
          </p>
        </div>

        <p style="margin-top:32px; font-size:14px; color:#888;">— ${SITE_NAME}</p>
        ${commonFooter}
      `,
    };
  }

  throw new Error("Unknown email template type");
}
// lib/gift-pdf.tsx
import React from "react";
// @ts-ignore - The browser types don't export renderToBuffer, but it works in Node.js
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// 品牌色彩 - 匹配网站和邮件模板
const COLORS = {
  primary: "#667eea",         // 主紫色
  primaryDark: "#764ba2",     // 深紫色（渐变用）
  accent: "#10b981",          // 绿色 - 用于强调
  gold: "#fbbf24",            // 金色 - 高级感
  text: "#1f2937",            // 深灰色 - 文字
  textLight: "#6b7280",       // 浅灰色 - 次要文字
  background: "#f9fafb",      // 浅灰背景
  white: "#ffffff",
  border: "#e5e7eb",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.background,
    padding: 0,
  },

  // Header section
  header: {
    backgroundColor: COLORS.primary,
    padding: 40,
    paddingTop: 50,
    paddingBottom: 50,
  },

  brandName: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 12,
    lineHeight: 1.4,
  },

  tagline: {
    fontSize: 13,
    color: COLORS.white,
    textAlign: "center",
    opacity: 0.9,
    letterSpacing: 1.5,
    lineHeight: 1.6,
  },

  giftCardTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginTop: 24,
    letterSpacing: 2,
    lineHeight: 1.4,
  },

  // Main content area
  contentContainer: {
    backgroundColor: COLORS.white,
    margin: 30,
    marginTop: -25,
    padding: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Value display - 紫色渐变效果
  valueContainer: {
    backgroundColor: COLORS.primary,
    padding: 30,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: "center",
  },

  valueLabel: {
    fontSize: 13,
    color: COLORS.white,
    marginBottom: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.9,
    lineHeight: 1.5,
  },

  valueAmount: {
    fontSize: 56,
    fontWeight: "bold",
    color: COLORS.white,
    marginVertical: 12,
    lineHeight: 1.2,
  },

  valueCurrency: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 6,
    lineHeight: 1.5,
  },

  validityText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 8,
  },

  // Code section
  codeContainer: {
    backgroundColor: COLORS.background,
    padding: 24,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "solid",
  },

  codeLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    lineHeight: 1.5,
  },

  code: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.primary,
    letterSpacing: 4,
    lineHeight: 1.3,
  },

  // Personal message section
  messageSection: {
    marginBottom: 30,
    padding: 24,
    backgroundColor: "#faf5ff",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },

  messageLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  messageTo: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: "bold",
    lineHeight: 1.5,
  },

  messageFrom: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
    fontWeight: "bold",
    lineHeight: 1.5,
  },

  messageText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 1.8,
    fontStyle: "italic",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 25,
  },

  // Info section
  infoSection: {
    marginBottom: 30,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },

  infoLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 1.5,
  },

  infoValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "bold",
    lineHeight: 1.5,
  },

  // Redemption instructions
  instructionsSection: {
    marginTop: 30,
    padding: 24,
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },

  instructionsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    lineHeight: 1.5,
  },

  instructionItem: {
    fontSize: 11,
    color: "#92400e",
    marginBottom: 10,
    paddingLeft: 16,
    lineHeight: 1.8,
  },

  redeemOption: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#fbbf24",
  },

  redeemTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 10,
    lineHeight: 1.5,
  },

  redeemText: {
    fontSize: 10,
    color: "#92400e",
    lineHeight: 1.7,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.textLight,
    lineHeight: 1.5,
  },

  footerWebsite: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "bold",
    lineHeight: 1.5,
  },

  // Icon text
  iconText: {
    fontSize: 24,
  },
});

export type GiftPdfProps = {
  value: number;             // 200 (CAD)
  code: string;              // GIFT-ABC123
  recipient?: string | null;
  sender?: string | null;
  message?: string | null;
  expiresAt?: string | null; // ISO date string
  purchasedAt?: string;      // ISO date string
  isGift?: boolean;
};

export function GiftCardPdfEnhanced(props: GiftPdfProps) {
  const { value, code, recipient, sender, message, expiresAt, purchasedAt, isGift } = props;

  // Format dates
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const expiryDate = formatDate(expiresAt);
  const purchaseDate = formatDate(purchasedAt) || formatDate(new Date().toISOString());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>REJUVENESSENCE</Text>
          <Text style={styles.tagline}>Medical Spa & Wellness</Text>
          <Text style={styles.giftCardTitle}>🎁 Gift Card</Text>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Gift Card Value</Text>
            <Text style={styles.valueAmount}>${value.toFixed(2)}</Text>
            <Text style={styles.valueCurrency}>CAD</Text>
            <Text style={styles.validityText}>Valid for 2 years</Text>
          </View>

          {/* Gift Card Code */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Your Gift Card Code</Text>
            <Text style={styles.code}>{code}</Text>
          </View>

          {/* Personal Message - Only if it's a gift */}
          {isGift && (recipient || sender || message) && (
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>Personal Message</Text>
              {recipient && (
                <Text style={styles.messageTo}>To: {recipient}</Text>
              )}
              {sender && (
                <Text style={styles.messageFrom}>From: {sender}</Text>
              )}
              {message && (
                <Text style={styles.messageText}>&quot;{message}&quot;</Text>
              )}
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Gift Card Details */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Purchased</Text>
              <Text style={styles.infoValue}>{purchaseDate}</Text>
            </View>
            {expiryDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expires</Text>
                <Text style={styles.infoValue}>{expiryDate}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Partial Use</Text>
              <Text style={styles.infoValue}>Allowed</Text>
            </View>
          </View>

          {/* Redemption Instructions */}
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsTitle}>How to Use Your Gift Card</Text>

            <Text style={styles.instructionItem}>
              • Present this PDF or your gift card code at our location
            </Text>
            <Text style={styles.instructionItem}>
              • Valid for any spa service or treatment
            </Text>
            <Text style={styles.instructionItem}>
              • Unused balance remains on your card for future visits
            </Text>
            <Text style={styles.instructionItem}>
              • Can be combined with other promotions
            </Text>

            <View style={styles.redeemOption}>
              <Text style={styles.redeemTitle}>💰 Redeem Online</Text>
              <Text style={styles.redeemText}>
                Visit rejuvenessence.org/redeem to add funds to your wallet {"\n"}
                and book online with ease. Your balance never expires!
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>281 Parkwood Ave, Keswick, ON L4P 2X4</Text>
            <Text style={styles.footerText}>booking@nesses.ca</Text>
          </View>
          <Text style={styles.footerWebsite}>rejuvenessence.org</Text>
        </View>
      </Page>
    </Document>
  );
}

// Export function to generate PDF buffer
export async function renderGiftPdfBuffer(p: GiftPdfProps): Promise<Buffer> {
  try {
    // Validate input props
    if (!p.code || !p.value) {
      throw new Error("Missing required props: code and value are required");
    }

    // Generate the PDF buffer directly using renderToBuffer
    const buffer = await renderToBuffer(<GiftCardPdfEnhanced {...p} />);

    // Validate buffer
    if (!buffer || buffer.length === 0) {
      console.error("[PDF] Rendering returned empty buffer for:", p);
      throw new Error("PDF rendering failed - empty buffer returned");
    }

    console.log(`[PDF] Successfully generated PDF buffer: ${buffer.length} bytes for code ${p.code}`);
    return buffer;
  } catch (err: any) {
    console.error("[PDF] Error generating PDF buffer:", {
      error: err.message,
      stack: err.stack,
      props: p,
    });
    throw new Error(`Failed to generate PDF buffer: ${err.message}`);
  }
}

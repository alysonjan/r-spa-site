"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import toast from "react-hot-toast";
import TabDetailsView from "./TabDetailsView";
import { ScanLine } from "lucide-react";

export default function QRScannerManagement() {
  const [scannedTabId, setScannedTabId] = useState<string | null>(null);

  useEffect(() => {
    if (scannedTabId) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.tab_id) {
            scanner.clear(); // Stop scanning
            setScannedTabId(parsed.tab_id);
          } else {
            toast.error("Invalid QR code. No tab ID found.", { id: "qr-error" });
          }
        } catch (e) {
          toast.error("Invalid QR format. Expected JSON.", { id: "qr-error" });
        }
      },
      (error) => {
        // Ignored. html5-qrcode calls this on every frame that doesn't have a QR code.
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [scannedTabId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {scannedTabId && (
        <TabDetailsView tabId={scannedTabId} onClose={() => setScannedTabId(null)} />
      )}

      <div style={{ display: scannedTabId ? "none" : "block" }}>
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
            <ScanLine className="w-6 h-6 text-purple-600" />
            Scan Customer QR Code
          </h2>
          <p className="text-zinc-500">Hold the customer's QR code up to the camera to open their tab.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

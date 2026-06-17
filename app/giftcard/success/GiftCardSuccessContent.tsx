// app/giftcard/success/GiftCardSuccessContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type GiftCard = {
  code: string;
  amount: number;
  recipient_name: string | null;
  recipient_email: string | null;
};

export default function GiftCardSuccessPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    
    const [loading, setLoading] = useState(true);
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
      if (!sessionId) {
        setError("No session ID found");
        setLoading(false);
        return;
      }

      // Fetch gift cards for this session
      fetchGiftCards();
    }, [sessionId]);

    async function fetchGiftCards(currentRetryCount: number = 0) {
      try {
        const response = await fetch(`/api/giftcard/session?session_id=${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch gift cards");
        }

        console.log("Gift cards data:", data);

        // If no gift cards found and we haven't retried too many times
        if ((!data.giftCards || data.giftCards.length === 0) && currentRetryCount < 10) {
          console.log(`No gift cards found yet, retrying in 2 seconds... (attempt ${currentRetryCount + 1}/10)`);
          setRetryCount(currentRetryCount + 1);

          // Retry after 2 seconds
          setTimeout(() => {
            fetchGiftCards(currentRetryCount + 1);
          }, 2000);
          return;
        }

        setGiftCards(data.giftCards || []);
        setTotalAmount(data.total || 0);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching gift cards:", err);

        // Retry on error if we haven't exceeded retry limit
        if (currentRetryCount < 10) {
          console.log(`Error fetching gift cards, retrying... (attempt ${currentRetryCount + 1}/10)`);
          setRetryCount(currentRetryCount + 1);
          setTimeout(() => {
            fetchGiftCards(currentRetryCount + 1);
          }, 2000);
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    }
  
    // Copy code with toast notification
    const handleCopyCode = (code: string) => {
      navigator.clipboard.writeText(code).then(() => {
        toast.success("Code copied to clipboard!", {
          icon: "📋",
          duration: 2000,
          style: {
            background: "#10b981",
            color: "#fff",
          },
        });
      }).catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy code");
      });
    };
  
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-900 font-semibold text-lg">Loading your gift cards...</p>
            {retryCount > 0 && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-500">
                  Waiting for payment confirmation... ({retryCount}/10)
                </p>
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/dev/simulate-webhook", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ session_id: sessionId }),
                        });
                        if (res.ok) {
                          toast.success("Webhook simulated! Loading cards...");
                          fetchGiftCards(0); // force instant refetch
                        } else {
                          toast.error("Failed to simulate webhook");
                        }
                      } catch (err) {
                        toast.error("Error simulating webhook");
                      }
                    }}
                    className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md border border-yellow-300 hover:bg-yellow-200 transition-colors text-sm font-medium"
                  >
                    [DEV] Simulate Stripe Webhook
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/giftcard/purchase" className="btn btn-primary">
              Try Again
            </Link>
          </div>
        </div>
      );
    }
  
    // If no gift cards found, show helpful message
    if (giftCards.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Gift Cards Processing
            </h1>
            <p className="text-gray-600 mb-6">
              Your gift cards are being created. This may take a few moments. 
              Please check your email for confirmation.
            </p>
            <div className="space-y-3">
              <Link href="/giftcard/purchase" className="block btn btn-primary w-full">
                Purchase More Gift Cards
              </Link>
              <Link href="/" className="block btn btn-ghost w-full">
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎉 Purchase Successful!
            </h1>
            <p className="text-xl text-gray-600">
              Your gift cards have been created
            </p>
          </div>
  
          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-2 border-green-100">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Gift Cards</p>
                <p className="text-3xl font-bold text-gray-900">{giftCards.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-indigo-600">
                  ${(totalAmount / 100).toFixed(2)} CAD
                </p>
              </div>
            </div>
  
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>What&apos;s next?</strong> Gift cards will be sent via email with PDF attachments and redemption links.
                    This may take a few minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* Gift Cards List */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Gift Cards</h2>
            
            <div className="space-y-4">
              {giftCards.map((card, index) => (
                <div
                  key={card.code}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Gift Card #{index + 1}</p>
                      <p className="text-2xl font-bold text-gray-900 font-mono tracking-wider">
                        {card.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Value</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        ${(card.amount / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
  
                  {(card.recipient_name || card.recipient_email) && (
                    <div className="border-t border-gray-200 pt-4 mb-4">
                      {card.recipient_name && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">To:</span> {card.recipient_name}
                        </p>
                      )}
                      {card.recipient_email && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Email:</span> {card.recipient_email}
                        </p>
                      )}
                    </div>
                  )}
  
                  <div className="flex gap-3">
                    <a
                      href={`/api/giftcard/pdf?code=${card.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn btn-outline text-center"
                    >
                      📄 Download PDF
                    </a>
                    <button
                      onClick={() => handleCopyCode(card.code)}
                      className="flex-1 btn btn-ghost text-center border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      📋 Copy Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* Instructions */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white mb-8">
            <h2 className="text-2xl font-bold mb-4">How to Use Your Gift Cards</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3 font-bold">
                  1
                </span>
                <p>
                  <strong>Check your email</strong> - Each gift card will be sent as a separate email with a PDF attachment
                </p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3 font-bold">
                  2
                </span>
                <p>
                  <strong>Redeem online</strong> - Visit the redemption link in the email or go to rejuvenessence.org/redeem
                </p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3 font-bold">
                  3
                </span>
                <p>
                  <strong>Save to wallet</strong> - Create an account to save your gift card balance for future bookings
                </p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3 font-bold">
                  4
                </span>
                <p>
                  <strong>Book services</strong> - Use your gift card or wallet balance when booking appointments
                </p>
              </div>
            </div>
          </div>
  
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/booking"
              className="flex-1 btn btn-primary text-center py-4 text-lg"
            >
              Book a Service
            </Link>
            <Link
              href="/giftcard/purchase"
              className="flex-1 btn btn-outline text-center py-4 text-lg"
            >
              Purchase More Gift Cards
            </Link>
          </div>
  
          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Have questions? Contact us at{" "}
              <a href="mailto:info@rejuvenessence.org" className="text-indigo-600 hover:underline">
                info@rejuvenessence.org
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Gift cards are valid for 2 years from the date of purchase
            </p>
          </div>
        </div>
      </div>
    );
  }
  
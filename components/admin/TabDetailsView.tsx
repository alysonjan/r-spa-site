"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type TabDetailsViewProps = {
  tabId: string;
  onClose: () => void;
};

export default function TabDetailsView({ tabId, onClose }: TabDetailsViewProps) {
  const [tabData, setTabData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTab();
  }, [tabId]);

  async function fetchTab() {
    try {
      setLoading(true);
      const res = await fetch(`/api/tabs/${tabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTabData(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load tab");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    try {
      setProcessing(true);
      const res = await fetch(`/api/tabs/${tabId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checked_in" })
      });
      if (!res.ok) throw new Error("Failed to check in");
      toast.success("Customer checked in");
      fetchTab();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCloseTab() {
    if (!confirm("Are you sure you want to close this tab?")) return;
    try {
      setProcessing(true);
      const res = await fetch(`/api/tabs/${tabId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" })
      });
      if (!res.ok) throw new Error("Failed to close tab");
      toast.success("Tab closed successfully");
      fetchTab();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Loading tab details...</div>;
  }

  if (!tabData) return null;

  const { tab, items } = tabData;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={onClose} className="flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-zinc-50 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{tab.customer_name || "Guest"}</h2>
            <p className="text-zinc-500">{tab.customer_email}</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${
              tab.status === "closed" ? "bg-red-50 text-red-700 border-red-200" :
              tab.status === "checked_in" ? "bg-green-50 text-green-700 border-green-200" :
              "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {tab.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Tab Items</h3>
            <div className="flex gap-2">
              {tab.status !== "closed" && (
                <button className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
             <p className="text-zinc-500 text-sm italic mb-6">No items on this tab.</p>
          ) : (
            <ul className="divide-y border rounded-lg mb-6">
              {items.map((item: any) => (
                <li key={item.id} className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.type} • Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">${(item.price_cents / 100).toFixed(2)}</p>
                </li>
              ))}
              <li className="p-3 flex justify-between items-center bg-zinc-50 rounded-b-lg">
                <p className="font-bold">Total</p>
                <p className="font-bold text-lg">${(tab.total_cents / 100).toFixed(2)}</p>
              </li>
            </ul>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {tab.status === "open" && (
              <button 
                onClick={handleCheckIn}
                disabled={processing}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Check In
              </button>
            )}
            
            {tab.status !== "closed" && (
              <button 
                onClick={handleCloseTab}
                disabled={processing}
                className="flex items-center px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 font-medium disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 mr-2" /> Close Tab
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Users, Receipt, CreditCard, Banknote, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

type Tab = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  total_cents: number;
  item_count: number;
  booking_id: string;
};

import TabDetailsView from "./TabDetailsView";

export default function TodayTabsManagement() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  useEffect(() => {
    fetchTabs();
  }, []);

  async function fetchTabs() {
    try {
      setLoading(true);
      const res = await fetch("/api/tabs/today");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tabs");
      setTabs(data.tabs || []);
      setDate(data.date || "");
    } catch (e: any) {
      toast.error(e.message || "Failed to load today's tabs");
    } finally {
      setLoading(false);
    }
  }

  const grandTotal = tabs.reduce((sum, t) => sum + (t.total_cents || 0), 0) / 100;
  const activeCount = tabs.filter((t) => t.status !== "closed").length;
  const totalItems = tabs.reduce((sum, t) => sum + (t.item_count || 0), 0);

  if (loading && !selectedTabId) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading today's tabs...</div>;
  }

  if (selectedTabId) {
    return (
      <TabDetailsView 
        tabId={selectedTabId} 
        onClose={() => {
          setSelectedTabId(null);
          fetchTabs(); // Refresh list when coming back
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Today's Customers</h1>
        <button
          onClick={fetchTabs}
          className="text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col items-center">
          <Users className="h-6 w-6 text-zinc-400 mb-2" />
          <p className="text-2xl font-bold">{tabs.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Tabs</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col items-center">
          <ShieldAlert className="h-6 w-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Active</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col items-center">
          <Receipt className="h-6 w-6 text-purple-500 mb-2" />
          <p className="text-2xl font-bold">{totalItems}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Items Availed</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col items-center">
          <Banknote className="h-6 w-6 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">${grandTotal.toFixed(2)}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Live Revenue</p>
        </div>
      </div>

      {/* Tabs List */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {tabs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-lg font-medium">No customers yet</p>
            <p className="text-sm">Customer tabs will appear here when they book or check in.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {tabs.map((tab) => (
              <li 
                key={tab.id} 
                className="p-4 hover:bg-zinc-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTabId(tab.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                      {(tab.customer_name || "G").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{tab.customer_name || "Guest"}</p>
                      <p className="text-sm text-zinc-500">{tab.customer_email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                      tab.status === "closed" ? "bg-red-50 text-red-700 border-red-200" :
                      tab.status === "checked_in" ? "bg-green-50 text-green-700 border-green-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {tab.status.replace("_", " ").toUpperCase()}
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-zinc-600">
                      <Receipt className="h-4 w-4" />
                      {tab.item_count}
                    </div>

                    <div className="flex items-center gap-1 text-sm font-medium">
                      <CreditCard className={`h-4 w-4 ${tab.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`} />
                      <span className={tab.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}>
                        {tab.payment_status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-lg font-bold w-24 text-right">
                      ${(tab.total_cents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

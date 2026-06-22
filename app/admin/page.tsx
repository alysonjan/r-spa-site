//app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Home, LogOut, GraduationCap, CreditCard, Users, X, Scissors, Heart } from "lucide-react";
import AdminCalendar from "@/components/AdminCalendar";
import ClassesManagement from "@/components/ClassesManagement";
import GiftCardsManagement from "@/components/GiftCardsManagement";
import ClientList from "@/components/ClientList";
import ServicesManagement from "@/components/ServicesManagement";
import BistroMenuManagement from "@/components/BistroMenuManagement";
import DonationsManagement from "@/components/DonationsManagement";
import AdminBookingDetailModal from "@/components/AdminBookingDetailModal";
import HolidayPackagesManagement from "@/components/admin/HolidayPackagesManagement";
import SpecialOffersManagement from "@/components/admin/SpecialOffersManagement";
import toast from "react-hot-toast";

type Booking = {
  id: string;
  service_name: string;
  name: string;
  email: string;
  phone: string;
  start: string;
  end: string;
  status: string;
};

type TabType = "bookings" | "classes" | "giftcards" | "clients" | "services" | "bistro" | "donations" | "packages" | "offers";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("bookings");
  const [pending, setPending] = useState<Booking[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    type: "deposit" | "refuse";
    booking: Booking;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState("Time slot unavailable");
  const [refuseTarget, setRefuseTarget] = useState<Booking | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🔄 Sync active tab with URL hash so refreshing doesn't lose your place
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["bookings", "classes", "giftcards", "clients", "services", "bistro", "donations", "packages", "offers"].includes(hash)) {
      setActiveTab(hash as TabType);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash.replace("#", "") !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // 📦 Load pending bookings
  useEffect(() => {
    if (activeTab === "bookings") {
      refreshPending();
    }
  }, [activeTab]);

  async function refreshPending() {
    try {
      const res = await fetch("/api/admin/bookings?status=pending");
      const data = await res.json();
      setPending(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load bookings");
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/admin/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) throw new Error("Failed to update booking status");
  }

  async function handleSendDeposit(b: Booking) {
    const loadingId = toast.loading("Sending deposit email...");
    try {
      const res = await fetch("/api/email/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: b.email,
          name: b.name,
          checkoutUrl: `${window.location.origin}/pay/${b.id}`,
          bookingId: b.id,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send email");

      const message = data.messageId
        ? `Deposit email sent! (id: ${data.messageId})`
        : "Deposit email sent!";
      toast.success(message, { id: loadingId });
      refreshPending();
    } catch (e: any) {
      toast.error(e.message || "Failed to send deposit email", { id: loadingId });
    } finally {
      setConfirmModal(null);
    }
  }
  
  function openRefuseModal(b: Booking) {
    setRefuseTarget(b);
    setRefuseReason("Time slot unavailable");
    setRefuseModalOpen(true);
  }

  async function handleRefuseConfirm() {
    if (!refuseTarget) return;

    const loadingId = toast.loading("Sending refusal email...");
    try {
      const res = await fetch("/api/email/refuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: refuseTarget.email,
          name: refuseTarget.name,
          reason: refuseReason.trim() || "Time slot unavailable",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send refusal email");

      await updateStatus(refuseTarget.id, "cancelled");
      toast.success("Refusal email sent.", { id: loadingId });
      refreshPending();
    } catch (e: any) {
      toast.error(e.message || "Failed to send refusal email", { id: loadingId });
    } finally {
      setRefuseModalOpen(false);
      setRefuseTarget(null);
    }
  }

  function formatDateTime(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      timeZone: "America/Toronto",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const modalVar = {
    hidden: { opacity: 0, scale: 0.9, y: 40 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 22 },
    },
    exit: { opacity: 0, scale: 0.9, y: 40 },
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-800">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white shadow-sm">
        <div className="p-4 border-b">
          <p className="text-sm font-medium text-zinc-800">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 text-sm">
          
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "bookings"
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Bookings
          </button>
          <button
            onClick={() => setActiveTab("giftcards")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "giftcards"
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Gift Cards
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "classes"
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Classes
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "clients"
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <Users className="h-4 w-4" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "services"
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <Scissors className="h-4 w-4" />
            Services
          </button>
          <button
            onClick={() => setActiveTab("bistro")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "bistro"
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coffee"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
            Bistro Menu
          </button>
          <button
            onClick={() => setActiveTab("donations")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "donations"
                ? "bg-pink-100 text-pink-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <Heart className="h-4 w-4" />
            Donations
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "packages"
                ? "bg-emerald-100 text-emerald-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package-search"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/><circle cx="18.5" cy="15.5" r="2.5"/><path d="M20.27 17.27 22 19"/></svg>
            Holiday Packages
          </button>

          <button
            onClick={() => setActiveTab("offers")}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${
              activeTab === "offers"
                ? "bg-red-100 text-red-700 font-medium"
                : "hover:bg-zinc-100"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gift"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            Special Offers
          </button>

          <Link href="/" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-100">
            <Home className="h-4 w-4" />
            Back to site
          </Link>
        </nav>

        <div className="border-t p-4">
          <form action="/api/admin/logout" method="post">
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Tab Header - Mobile with horizontal scroll */}
          <div className="md:hidden space-y-3">
            <div className="bg-white rounded-lg p-1 border overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "bookings"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Bookings
                </button>
                <button
                  onClick={() => setActiveTab("classes")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "classes"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Classes
                </button>
                <button
                  onClick={() => setActiveTab("giftcards")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "giftcards"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Gift Cards
                </button>
                <button
                  onClick={() => setActiveTab("clients")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "clients"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Clients
                </button>
                <button
                  onClick={() => setActiveTab("services")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "services"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => setActiveTab("bistro")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "bistro"
                      ? "bg-purple-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Bistro
                </button>
                <button
                  onClick={() => setActiveTab("donations")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "donations"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Donations
                </button>
                <button
                  onClick={() => setActiveTab("packages")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "packages"
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Holiday Pkgs
                </button>
                <button
                  onClick={() => setActiveTab("offers")}
                  className={`flex-none min-w-[100px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "offers"
                      ? "bg-red-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Offers
                </button>
              </div>
            </div>
          </div>

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <h1 className="text-2xl font-semibold">Bookings Schedule</h1>
              <div className="rounded-xl border bg-white p-3 md:p-4 shadow-sm">
                <AdminCalendar
                  onEventClick={(event: any) => setSelectedBooking(event)}
                />
              </div>

              {/* Pending list */}
              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold mb-3">Pending Bookings</h2>
                {pending.length === 0 && <p className="text-sm text-zinc-500">No pending bookings.</p>}
                <ul className="space-y-3">
                  {pending.map((b) => (
                    <li
                      key={b.id}
                      className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:border-emerald-300 transition cursor-pointer"
                      onClick={() => setSelectedBooking({
                        id: b.id,
                        title: b.service_name,
                        start: b.start,
                        end: b.end,
                        status: b.status,
                        name: b.name,
                        email: b.email,
                        phone: b.phone,
                        service_name: b.service_name,
                      })}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{b.service_name}</p>
                        <p className="text-sm text-zinc-500">
                          {b.name} · {b.phone}
                        </p>
                        <p className="text-sm text-zinc-600 mt-1">
                          {formatDateTime(b.start)}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendDeposit(b);
                          }}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Send Deposit Email
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRefuseModal(b);
                          }}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Refuse Booking
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </motion.div>
          )}

          {/* Holiday Packages Tab */}
          {activeTab === "packages" && (
            <motion.div
              key="packages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <HolidayPackagesManagement />
            </motion.div>
          )}

          {/* Special Offers Tab */}
          {activeTab === "offers" && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <SpecialOffersManagement />
            </motion.div>
          )}

          {/* Classes Tab */}
          {activeTab === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-semibold">Classes Management</h1>
              </div>
              <ClassesManagement />
            </motion.div>
          )}

          {/* Gift Cards Tab */}
          {activeTab === "giftcards" && (
            <motion.div
              key="giftcards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-semibold">Gift Cards Management</h1>
              </div>
              <GiftCardsManagement />
            </motion.div>
          )}

          {/* Clients Tab */}
          {activeTab === "clients" && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                <ClientList />
              </div>
            </motion.div>
          )}

          {/* Services Tab / Bistro Tab */}
          {(activeTab === "services" || activeTab === "bistro") && (
            <motion.div
              key="services-bistro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                {activeTab === "services" && <ServicesManagement />}
                {activeTab === "bistro" && <BistroMenuManagement />}
              </div>
            </motion.div>
          )}

          {/* Donations Tab */}
          {activeTab === "donations" && (
            <motion.div
              key="donations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-semibold">Donations Tracking</h1>
              </div>
              <DonationsManagement />
            </motion.div>
          )}
        </div>
      </main>

      {/* Admin Booking Detail Modal */}
      <AdminBookingDetailModal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        isMobile={isMobile}
        onRefresh={refreshPending}
      />

      {/* Refuse Modal */}
      <AnimatePresence>
        {refuseModalOpen && refuseTarget && (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRefuseModalOpen(false)}
            />

            <motion.div
              className={
                isMobile
                  ? "fixed z-[201] inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl border p-4"
                  : "fixed z-[201] left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border p-4"
              }
              initial={
                isMobile
                  ? { y: 30, opacity: 0 }
                  : { opacity: 0, scale: 0.95, y: 10 }
              }
              animate={
                isMobile
                  ? { y: 0, opacity: 1 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              exit={
                isMobile
                  ? { y: 30, opacity: 0 }
                  : { opacity: 0, scale: 0.95, y: 10 }
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-zinc-900">
                    Refuse Booking
                  </h4>
                  <p className="text-sm text-zinc-600 mt-1">
                    Enter reason (will be sent to customer)
                  </p>
                </div>

                <button
                  className="p-2 rounded-lg hover:bg-zinc-100"
                  onClick={() => setRefuseModalOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block text-sm font-medium text-zinc-700 mt-4">
                Refusal Reason
              </label>

              <textarea
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                placeholder="Time slot unavailable"
              />

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  className="px-3 py-2 text-sm rounded-lg bg-zinc-100 hover:bg-zinc-200"
                  onClick={() => setRefuseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                  onClick={handleRefuseConfirm}
                >
                  Confirm Refuse
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
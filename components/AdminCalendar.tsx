"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import BookingForm from "./BookingForm";
import { X } from "lucide-react";

type BookingEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
};

type Props = {
  onEventClick?: (event: any) => void;
};

export default function AdminCalendar({ onEventClick }: Props) {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  // ✅ 监听窗口宽度
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ 获取数据
  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load events");
    }
  }

  // ✅ 格式化时间
  function formatTimeRange(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], opts)} → ${e.toLocaleTimeString([], opts)}`;
  }

  // Filter events based on showCancelled toggle
  const safeEvents = Array.isArray(events) ? events : [];
  const filteredEvents = showCancelled
    ? safeEvents
    : safeEvents.filter((e) => e.status !== "cancelled");

  return (
    <div className="relative w-full">
      {/* Toolbar with Add Appointment button and Show Cancelled toggle */}
      <div className={`mb-4 flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Show cancelled bookings</span>
          </label>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`${isMobile ? 'w-full' : ''} px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors`}
        >
          + Add Appointment
        </button>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={isMobile ? "listWeek" : "dayGridMonth"}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: isMobile ? "" : "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        events={filteredEvents}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        views={{
          listWeek: {
            listDayFormat: { weekday: "short", month: "short", day: "numeric" },
            listDaySideFormat: false,
          },
        }}
        eventClassNames={(arg) => {
          const status = arg.event.extendedProps.status;
          const classes = ["cursor-pointer"];

          // Add status-based color classes
          if (status === "pending") {
            classes.push("!bg-yellow-100", "!border-yellow-400", "!text-yellow-800");
          } else if (status === "awaiting_deposit") {
            classes.push("!bg-blue-100", "!border-blue-400", "!text-blue-800");
          } else if (status === "confirmed") {
            classes.push("!bg-green-100", "!border-green-400", "!text-green-800");
          } else if (status === "cancelled") {
            classes.push("!bg-zinc-100", "!border-zinc-300", "!text-zinc-600");
          }

          return classes;
        }}
        eventClick={(info) => {
          const event = info.event.extendedProps as BookingEvent;
          const fullEvent = {
            id: info.event.id,
            title: info.event.title,
            start: info.event.startStr,
            end: info.event.endStr,
            ...event,
          };

          // Always use onEventClick if provided (for both mobile and desktop)
          if (onEventClick) {
            onEventClick(fullEvent);
          }
        }}
      />

      {/* Add Appointment Modal */}
      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showAddModal && (
              <>
                <motion.div
                  className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddModal(false)}
                />

                {isMobile ? (
                  // Mobile: Bottom sheet
                  <motion.div
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 100) setShowAddModal(false);
                    }}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 240, damping: 25 }}
                    className="fixed left-0 right-0 bottom-0 z-[9999]
                               bg-white rounded-t-[2rem] shadow-xl
                               p-6 max-h-[90vh] overflow-y-auto
                               pb-[env(safe-area-inset-bottom)] touch-pan-y"
                  >
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-300" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Add Appointment</h3>
                      <button
                        onClick={() => setShowAddModal(false)}
                        className="p-1 hover:bg-zinc-100 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <BookingForm
                      endpoint="/api/admin/bookings"
                      submitLabel="Create Appointment"
                      hideHoneypot={true}
                      compact={true}
                      onSuccess={(data) => {
                        toast.success("Appointment created!");
                        setShowAddModal(false);
                        loadBookings();
                      }}
                    />
                  </motion.div>
                ) : (
                  // Desktop: Centered modal
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setShowAddModal(false);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">Add Appointment</h3>
                        <button
                          onClick={() => setShowAddModal(false)}
                          className="p-1 hover:bg-zinc-100 rounded"
                        >
                          <X size={24} />
                        </button>
                      </div>
                      <BookingForm
                        endpoint="/api/admin/bookings"
                        submitLabel="Create Appointment"
                        hideHoneypot={true}
                        onSuccess={(data) => {
                          toast.success("Appointment created!");
                          setShowAddModal(false);
                          loadBookings();
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

    </div>
  );
}

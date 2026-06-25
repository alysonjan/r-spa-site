"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit2, X, ImageIcon, Archive, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

type NewsletterEvent = {
  id: string;
  title: string;
  date_info: string;
  location: string | null;
  description: string | null;
  highlights: string[];
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  is_archived: boolean;
  display_order: number;
};

export default function NewsletterManagement() {
  const [events, setEvents] = useState<NewsletterEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<NewsletterEvent>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/newsletters");
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
      } else {
        toast.error("Failed to load events: " + data.error);
      }
    } catch (err) {
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }

  const openModal = (event?: NewsletterEvent) => {
    if (event) {
      setCurrentEvent(event);
    } else {
      setCurrentEvent({
        title: "",
        date_info: "",
        location: "",
        description: "",
        highlights: [""],
        image_url: "",
        link_url: "",
        link_text: "",
        is_archived: false,
        display_order: events.length,
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentEvent({});
    setImageFile(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(currentEvent.id ? "Updating event..." : "Creating event...");

    try {
      let image_url = currentEvent.image_url;

      // Upload image if selected (reusing bistro upload endpoint)
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/admin/bistro/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload image");
        image_url = uploadData.url;
      }

      const payload = { ...currentEvent, image_url };
      // Filter out empty highlights
      if (payload.highlights) {
        payload.highlights = payload.highlights.filter(h => h.trim() !== "");
      }

      const res = await fetch("/api/admin/newsletters", {
        method: currentEvent.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save event");

      toast.success(currentEvent.id ? "Event updated!" : "Event created!", { id: loadingToast });
      closeModal();
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/newsletters?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Event deleted");
        fetchEvents();
      } else {
        toast.error("Failed to delete event");
      }
    } catch (err) {
      toast.error("Failed to delete event");
    }
  };

  const handleToggleArchive = async (id: string, currentArchived: boolean) => {
    try {
      const res = await fetch("/api/admin/newsletters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_archived: !currentArchived }),
      });
      if (res.ok) {
        toast.success(currentArchived ? "Moved to Upcoming" : "Archived");
        fetchEvents();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...(currentEvent.highlights || [])];
    newHighlights[index] = value;
    setCurrentEvent({ ...currentEvent, highlights: newHighlights });
  };

  const addHighlight = () => {
    setCurrentEvent({ ...currentEvent, highlights: [...(currentEvent.highlights || []), ""] });
  };

  const removeHighlight = (index: number) => {
    const newHighlights = [...(currentEvent.highlights || [])];
    newHighlights.splice(index, 1);
    setCurrentEvent({ ...currentEvent, highlights: newHighlights });
  };

  const upcomingEvents = events.filter(e => !e.is_archived);
  const archivedEvents = events.filter(e => e.is_archived);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
        <div>
          <h1 className="text-2xl font-serif text-zinc-900">Newsletter Management</h1>
          <p className="text-zinc-500 mt-1">Add, edit, and archive events for the newsletter page.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h2 className="font-semibold text-zinc-900">Upcoming Events</h2>
        </div>
        <div className="divide-y divide-zinc-200">
          {upcomingEvents.map(event => (
            <div key={event.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-zinc-50/50 transition-colors">
              <div className="w-full md:w-48 h-32 flex-shrink-0 relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-zinc-900">{event.title}</h3>
                <p className="text-sm text-emerald-600 font-medium">{event.date_info}</p>
                <p className="text-sm text-zinc-600 mt-1">{event.location}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => openModal(event)} className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-100 text-zinc-700 flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleToggleArchive(event.id, event.is_archived)} className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-amber-50 text-amber-700 flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="px-3 py-1.5 text-sm border border-rose-200 rounded hover:bg-rose-50 text-rose-600 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {upcomingEvents.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No upcoming events found.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h2 className="font-semibold text-zinc-900">Archived (Past Events)</h2>
        </div>
        <div className="divide-y divide-zinc-200">
          {archivedEvents.map(event => (
            <div key={event.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-zinc-50/50 transition-colors">
              <div className="w-full md:w-32 h-24 flex-shrink-0 relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <h3 className="text-md font-semibold text-zinc-900">{event.title}</h3>
                <p className="text-sm text-zinc-500">{event.date_info}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openModal(event)} className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleArchive(event.id, event.is_archived)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Restore to Upcoming">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {archivedEvents.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No archived events found.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100">
              <h2 className="text-xl font-serif font-bold text-zinc-900">
                {currentEvent.id ? "Edit Event" : "Add Event"}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title *</label>
                  <input 
                    required type="text" 
                    value={currentEvent.title || ""} 
                    onChange={e => setCurrentEvent({...currentEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                    placeholder="e.g., Seqex & ICR Therapy Immersion"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Date Info *</label>
                    <input 
                      required type="text" 
                      value={currentEvent.date_info || ""} 
                      onChange={e => setCurrentEvent({...currentEvent, date_info: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                      placeholder="e.g., Spring 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Location / Format</label>
                    <input 
                      type="text" 
                      value={currentEvent.location || ""} 
                      onChange={e => setCurrentEvent({...currentEvent, location: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                      placeholder="e.g., Toronto / York Region"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description (Optional)</label>
                  <textarea 
                    rows={2}
                    value={currentEvent.description || ""} 
                    onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Highlights / Bullet Points</label>
                  <div className="space-y-2">
                    {(currentEvent.highlights || []).map((highlight, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={highlight}
                          onChange={(e) => handleHighlightChange(index, e.target.value)}
                          className="flex-grow px-3 py-1.5 border border-zinc-300 rounded-md focus:ring-emerald-500 text-sm"
                          placeholder="e.g., Hands-on training with Seqex devices"
                        />
                        <button type="button" onClick={() => removeHighlight(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded border border-rose-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addHighlight} className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    + Add bullet point
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Button Link URL</label>
                    <input 
                      type="text" 
                      value={currentEvent.link_url || ""} 
                      onChange={e => setCurrentEvent({...currentEvent, link_url: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm" 
                      placeholder="e.g., /booking"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Button Text</label>
                    <input 
                      type="text" 
                      value={currentEvent.link_text || ""} 
                      onChange={e => setCurrentEvent({...currentEvent, link_text: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm" 
                      placeholder="e.g., Join the waitlist"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Event Image</label>
                  <div className="flex items-start gap-4">
                    <div className="w-32 h-24 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 flex-shrink-0 relative">
                      {imageFile ? (
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : currentEvent.image_url ? (
                        <img src={currentEvent.image_url} alt="Current" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1">
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-[10px]">No image</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50 text-zinc-700"
                      >
                        Choose Image
                      </button>
                      <p className="text-xs text-zinc-500 mt-2 max-w-[200px]">
                        Recommended: 4:3 aspect ratio (e.g. 800x600px).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                  <input
                    type="checkbox"
                    id="is_archived"
                    checked={currentEvent.is_archived || false}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, is_archived: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <label htmlFor="is_archived" className="text-sm font-medium text-zinc-700">
                    Mark as Archived (Past Event)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-md font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium transition-colors">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

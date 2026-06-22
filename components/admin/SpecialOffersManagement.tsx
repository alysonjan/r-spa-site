"use client";

import { useState, useEffect } from "react";
import { Gift, Plus, Trash2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

type SpecialOffer = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  action_label: string;
  is_active: boolean;
  display_order: number;
  active_to?: string;
};

export default function SpecialOffersManagement() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<SpecialOffer>>({
    title: "",
    description: "",
    type: "addon",
    action_label: "Apply",
    is_active: true,
    display_order: 0,
    active_to: "",
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/special-offers");
      const data = await res.json();
      if (res.ok) {
        setOffers(data.offers);
      } else {
        toast.error("Failed to load offers: " + data.error);
      }
    } catch (err) {
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      type: "addon",
      action_label: "Apply",
      is_active: true,
      display_order: offers.length,
      active_to: "",
    });
  };

  const handleEdit = (offer: SpecialOffer) => {
    setEditingId(offer.id);
    setFormData({ ...offer });
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/admin/special-offers/${editingId}` : "/api/admin/special-offers";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          code: formData.code,
          description: formData.description,
          type: formData.type,
          actionLabel: formData.action_label,
          isActive: formData.is_active,
          displayOrder: formData.display_order,
          activeTo: formData.active_to ? new Date(formData.active_to).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Offer updated!" : "Offer created!");
        resetForm();
        loadOffers();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (err) {
      toast.error("Failed to save offer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/admin/special-offers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Offer deleted");
        loadOffers();
      } else {
        toast.error("Failed to delete");
      }
    } catch (err) {
      toast.error("Error deleting offer");
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/special-offers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        toast.success(`Offer ${!current ? 'enabled' : 'disabled'}`);
        loadOffers();
      }
    } catch (err) {
      toast.error("Failed to toggle");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-light text-slate-800 flex items-center gap-2">
            <Gift className="w-5 h-5 text-slate-400" />
            Special Offers
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage promotional blocks in the floating modal.</p>
        </div>
        <button
          onClick={resetForm}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 text-sm hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Add Offer
        </button>
      </div>

      <div className="flex flex-col md:flex-row min-h-[600px] max-h-[800px]">
        {/* Left Side: List */}
        <div className="w-full md:w-1/2 border-r border-slate-200 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
              <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
              <p>No offers found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {offers.map(offer => (
                <div key={offer.id} className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${editingId === offer.id ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : ''}`} onClick={() => handleEdit(offer)}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-slate-800">{offer.title}</h3>
                    <div className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Order: {offer.display_order}</div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{offer.description}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(offer.id, offer.is_active); }}
                        className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${offer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {offer.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {offer.is_active ? 'Active' : 'Hidden'}
                      </button>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 capitalize">
                        {offer.type}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(offer.id); }}
                      className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-slate-50">
          <h3 className="text-lg font-medium text-slate-800 mb-6 border-b border-slate-200 pb-2">
            {editingId ? "Edit Offer" : "Create New Offer"}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.title || ""} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Hydro Upgrade +15min" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.type || "addon"} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="addon">Add-on</option>
                  <option value="giftcard">Gift Card</option>
                  <option value="referral">Referral</option>
                  <option value="packages">Packages Link</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Code</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.code || ""} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. hydro-upgrade" disabled={!!editingId} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea className="w-full p-2 border border-slate-300 rounded-lg text-sm" rows={3} value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Displayed below title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Button Text</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.action_label || ""} onChange={e => setFormData({...formData, action_label: e.target.value})} placeholder="e.g. Apply Add-on" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
                <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.display_order || 0} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value)})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date & Time (Optional)</label>
              <input 
                type="datetime-local" 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm" 
                value={formData.active_to ? new Date(formData.active_to).toISOString().slice(0, 16) : ""} 
                onChange={e => setFormData({...formData, active_to: e.target.value})} 
              />
              <p className="text-xs text-slate-500 mt-1">If set, the offer will automatically hide after this time.</p>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={resetForm} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-100">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">Save Offer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

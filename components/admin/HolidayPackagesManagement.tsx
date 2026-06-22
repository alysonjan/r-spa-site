"use client";

import { useState, useEffect } from "react";
import { PackageSearch, Plus, Edit, Trash2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

type Package = {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  short_desc: string;
  inclusions: string[];
  highlight?: string;
  fine_print: string[];
  available: boolean;
  active_to?: string;
};

export default function HolidayPackagesManagement() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Package>>({
    name: "",
    price_cents: 10000,
    short_desc: "",
    inclusions: [""],
    fine_print: [""],
    available: true,
    active_to: "",
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/holiday-packages");
      const data = await res.json();
      if (res.ok) {
        setPackages(data.packages);
      } else {
        toast.error("Failed to load packages: " + data.error);
      }
    } catch (err) {
      toast.error("Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      price_cents: 10000,
      short_desc: "",
      inclusions: [""],
      fine_print: [""],
      available: true,
      active_to: "",
    });
  };

  const handleEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setFormData({ ...pkg });
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/admin/holiday-packages/${editingId}` : "/api/admin/holiday-packages";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          priceCents: formData.price_cents,
          shortDesc: formData.short_desc,
          inclusions: formData.inclusions?.filter(i => i.trim() !== ""),
          highlight: formData.highlight,
          finePrint: formData.fine_print?.filter(i => i.trim() !== ""),
          available: formData.available,
          activeTo: formData.active_to ? new Date(formData.active_to).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Package updated!" : "Package created!");
        resetForm();
        loadPackages();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (err) {
      toast.error("Failed to save package");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/admin/holiday-packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Package deleted");
        loadPackages();
      } else {
        toast.error("Failed to delete");
      }
    } catch (err) {
      toast.error("Error deleting package");
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/holiday-packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !current }),
      });
      if (res.ok) {
        toast.success(`Package ${!current ? 'enabled' : 'disabled'}`);
        loadPackages();
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
            <PackageSearch className="w-5 h-5 text-slate-400" />
            Holiday Packages
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage special offers and packages.</p>
        </div>
        <button
          onClick={resetForm}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 text-sm hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-[800px]">
        {/* Left Side: List */}
        <div className="w-full md:w-1/2 border-r border-slate-200 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : packages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
              <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
              <p>No packages found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {packages.map(pkg => (
                <div key={pkg.id} className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${editingId === pkg.id ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : ''}`} onClick={() => handleEdit(pkg)}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-slate-800">{pkg.name}</h3>
                    <div className="text-emerald-600 font-medium">${(pkg.price_cents / 100).toFixed(2)}</div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1 mb-3">{pkg.short_desc}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAvailability(pkg.id, pkg.available); }}
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${pkg.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {pkg.available ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {pkg.available ? 'Active' : 'Hidden'}
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(pkg.id); }}
                      className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
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
            {editingId ? "Edit Package" : "Create New Package"}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Package Name</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Winter Glow" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (Cents)</label>
                <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.price_cents || 0} onChange={e => setFormData({...formData, price_cents: parseInt(e.target.value)})} placeholder="e.g. 10000 for $100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Code (Unique)</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.code || ""} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. winter_glow" disabled={!!editingId} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short Description</label>
              <textarea className="w-full p-2 border border-slate-300 rounded-lg text-sm" rows={2} value={formData.short_desc || ""} onChange={e => setFormData({...formData, short_desc: e.target.value})} placeholder="Displayed below title" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Highlight Badge (Optional)</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={formData.highlight || ""} onChange={e => setFormData({...formData, highlight: e.target.value})} placeholder="e.g. Best Value!" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date & Time (Optional)</label>
              <input 
                type="datetime-local" 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm" 
                value={formData.active_to ? new Date(formData.active_to).toISOString().slice(0, 16) : ""} 
                onChange={e => setFormData({...formData, active_to: e.target.value})} 
              />
              <p className="text-xs text-slate-500 mt-1">If set, the package will automatically be hidden after this time.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                Inclusions
                <button onClick={() => setFormData({...formData, inclusions: [...(formData.inclusions || []), ""]})} className="text-emerald-600 text-xs">+ Add</button>
              </label>
              {formData.inclusions?.map((inc, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" className="flex-1 p-2 border border-slate-300 rounded-lg text-sm" value={inc} onChange={e => {
                    const newInc = [...(formData.inclusions || [])];
                    newInc[i] = e.target.value;
                    setFormData({...formData, inclusions: newInc});
                  }} placeholder="e.g. 60-min Massage" />
                  <button onClick={() => {
                    const newInc = formData.inclusions?.filter((_, index) => index !== i);
                    setFormData({...formData, inclusions: newInc});
                  }} className="text-red-400 p-2"><XCircle className="w-4 h-4"/></button>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={resetForm} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-100">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">Save Package</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

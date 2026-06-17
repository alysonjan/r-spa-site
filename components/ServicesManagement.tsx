import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type ServiceOption = {
  time: string;
  price: string;
};

type Service = {
  id: string;
  title: string;
  category: string;
  description: string;
  image_url: string;
  options: { time: string; price: string }[];
  availability: { days: string[]; times: string[] };
  is_active: boolean;
};

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Standard Massage");
  const [description, setDescription] = useState("");
  const [optionsList, setOptionsList] = useState<{ time: string; price: string }[]>([{ time: "60", price: "100" }]);
  const [isActive, setIsActive] = useState(true);

  const CATEGORIES = [
    { value: "Standard Massage", label: "Standard Massage" },
    { value: "Specialized Therapy", label: "Specialized Therapy" },
    { value: "Therapies", label: "Therapies" },
    { value: "Other", label: "Other" }
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  function openNewModal() {
    setEditingService(null);
    setTitle("");
    setCategory("Standard Massage");
    setDescription("");
    setOptionsList([{ time: "60", price: "100" }]);
    setIsActive(true);
    setIsModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setTitle(service.title || "");
    
    let mappedCategory = service.category || "Standard Massage";
    const validCategories = CATEGORIES.map(c => c.value);
    if (!validCategories.includes(mappedCategory)) {
      if (mappedCategory === "lymphatic") mappedCategory = "Specialized Therapy";
      else if (["head", "back-shoulders", "foot", "full-body"].includes(mappedCategory)) mappedCategory = "Standard Massage";
      else mappedCategory = "Therapies";
    }
    setCategory(mappedCategory);
    
    setDescription(service.description || "");
    setOptionsList(service.options?.length > 0 ? service.options : [{ time: "60", price: "100" }]);
    setIsActive(service.is_active !== false);
    setIsModalOpen(true);
  }

  async function handleToggleStatus(service: Service) {
    const toastId = toast.loading("Updating status...");
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...service, is_active: !service.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      
      setServices(services.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
      toast.success("Status updated", { id: toastId });
    } catch (e: any) {
      toast.error(e.message, { id: toastId });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this service? This cannot be undone.")) return;
    
    const toastId = toast.loading("Deleting...");
    try {
      const res = await fetch(`/api/admin/services?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      
      setServices(services.filter(s => s.id !== id));
      toast.success("Deleted successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e.message, { id: toastId });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (optionsList.length === 0) {
      toast.error("Please add at least one duration/price option");
      return;
    }

    // Convert numbers back to strings if typed as numbers
    const parsedOptions = optionsList.map(o => ({ 
      time: o.time.toString(), 
      price: o.price.toString() 
    }));

    const toastId = toast.loading("Saving service...");
    try {
      const payload = {
        id: editingService?.id,
        title,
        category,
        description,
        options: parsedOptions,
        is_active: isActive,
      };

      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error("Failed to save");
      
      toast.success("Service saved!", { id: toastId });
      setIsModalOpen(false);
      fetchServices();
    } catch (e: any) {
      toast.error(e.message, { id: toastId });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold font-serif text-zinc-900">Manage Services</h2>
        <button
          onClick={openNewModal}
          className="bg-black text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-zinc-800 transition flex items-center gap-2"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="text-zinc-500 bg-zinc-50 p-6 text-center rounded-xl border border-zinc-200">
          No services found. Add one above!
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Service</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Options</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">{service.title}</div>
                      <div className="text-xs text-zinc-500 truncate max-w-[200px]">{service.description}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 capitalize">
                      {service.category}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {service.options?.length || 0} option(s)
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(service)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          service.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {service.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {service.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditModal(service)}
                          className="text-zinc-400 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="text-zinc-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-serif font-bold text-zinc-900">
                {editingService ? "Edit Service" : "Add New Service"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="serviceForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Service Title</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                    placeholder="e.g. Swedish Massage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                    placeholder="Short description..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-zinc-700">Durations & Pricing</label>
                    <button
                      type="button"
                      onClick={() => setOptionsList([...optionsList, { time: "", price: "" }])}
                      className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-md"
                    >
                      <Plus size={14} /> Add Option
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {optionsList.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 relative group transition-colors hover:border-zinc-300">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase text-zinc-500 font-semibold mb-1 block">Time (Mins)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={opt.time}
                            onChange={(e) => {
                              const newOpts = [...optionsList];
                              newOpts[idx].time = e.target.value;
                              setOptionsList(newOpts);
                            }}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all bg-white"
                            placeholder="60"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] uppercase text-zinc-500 font-semibold mb-1 block">Price ($)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={opt.price}
                            onChange={(e) => {
                              const newOpts = [...optionsList];
                              newOpts[idx].price = e.target.value;
                              setOptionsList(newOpts);
                            }}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all bg-white"
                            placeholder="100"
                          />
                        </div>
                        {optionsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = optionsList.filter((_, i) => i !== idx);
                              setOptionsList(newOpts);
                            }}
                            className="mt-6 p-1 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Remove option"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-black focus:ring-black shrink-0"
                  />
                  <label htmlFor="isActiveCheck" className="text-sm text-zinc-700 cursor-pointer select-none">
                    <span className="font-medium">Service is Active</span>
                    <br />
                    <span className="text-xs text-zinc-500">(Visible to customers)</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="serviceForm"
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

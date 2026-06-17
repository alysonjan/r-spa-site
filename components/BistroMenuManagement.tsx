"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, UploadCloud, Search, Edit2, Trash2, Image as ImageIcon, X, LayoutTemplate, List, Check, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function BistroMenuManagement() {
  const [activeTab, setActiveTab] = useState<"items" | "menus">("items");
  const [items, setItems] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  
  // Item Form State
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Menu Form State
  const [currentMenu, setCurrentMenu] = useState<any>(null);
  const [selectedItemsForMenu, setSelectedItemsForMenu] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      await Promise.all([fetchItems(), fetchMenus()]);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchItems() {
    try {
      const res = await fetch("/api/admin/bistro/items");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      toast.error("Failed to load items");
    }
  }

  async function fetchMenus() {
    try {
      const res = await fetch("/api/admin/bistro/menus");
      const data = await res.json();
      setMenus(data.menus || []);
    } catch (err) {
      toast.error("Failed to load menus");
    }
  }

  // --- ITEM HANDLERS ---
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(currentItem.id ? "Updating item..." : "Creating item...");

    try {
      let image_url = currentItem.image_url;

      // Upload image if selected
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

      const payload = { ...currentItem, image_url };

      const res = await fetch("/api/admin/bistro/items", {
        method: currentItem.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save item");

      toast.success(currentItem.id ? "Item updated!" : "Item created!", { id: loadingToast });
      closeItemModal();
      fetchItems();
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/admin/bistro/items?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Item deleted");
      fetchItems();
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch("/api/admin/bistro/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      fetchItems();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const openItemModal = (item: any = null) => {
    setCurrentItem(item || { item_name: "", category: "Other", description: "", base_price: 0, current_price: 0, is_active: true, image_url: "" });
    setImageFile(null);
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setCurrentItem(null);
    setImageFile(null);
  };

  // --- EXCEL IMPORT ---
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading("Importing items...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/bistro/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import");
      
      toast.success(data.message || "Import successful!", { id: loadingToast });
      fetchItems();
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  // --- MENU HANDLERS ---
  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Saving menu template...");

    try {
      const payload = { 
        id: currentMenu.id,
        name: currentMenu.name, 
        itemIds: Array.from(selectedItemsForMenu) 
      };

      const res = await fetch("/api/admin/bistro/menus", {
        method: currentMenu.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save menu");

      toast.success("Menu saved!", { id: loadingToast });
      setIsMenuModalOpen(false);
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu template?")) return;
    try {
      const res = await fetch(`/api/admin/bistro/menus?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Menu deleted");
      fetchMenus();
    } catch (err) {
      toast.error("Failed to delete menu");
    }
  };

  const openMenuModal = (menu: any = null) => {
    setCurrentMenu(menu || { name: "" });
    setSelectedItemsForMenu(new Set(menu?.items || []));
    setIsMenuModalOpen(true);
  };

  // --- RENDERING ---
  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex space-x-1 bg-zinc-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-colors ${activeTab === "items" ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <List className="w-4 h-4" />
          Master Items
        </button>
        <button
          onClick={() => setActiveTab("menus")}
          className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-colors ${activeTab === "menus" ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <LayoutTemplate className="w-4 h-4" />
          Menu Templates
        </button>
      </div>

      {activeTab === "items" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-md text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a 
                href="/bistro-menu-template.xlsx" 
                download
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
                title="Download Excel Template"
              >
                <Download className="w-4 h-4" />
                Template
              </a>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={excelInputRef}
                onChange={handleExcelImport}
              />
              <button 
                onClick={() => excelInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
              >
                <UploadCloud className="w-4 h-4" />
                Import Excel
              </button>
              <button 
                onClick={() => openItemModal()}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Image</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className={`border-b border-zinc-100 ${!item.is_active ? 'bg-zinc-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.item_name} className="w-12 h-12 rounded object-cover border border-zinc-200" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      <div>{item.item_name}</div>
                      {item.description && <div className="text-xs text-zinc-500 mt-1 max-w-xs truncate">{item.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{item.category}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      ${item.current_price || item.base_price || 0}
                      {item.current_price > 0 && item.base_price > 0 && item.current_price < item.base_price && <span className="ml-2 text-xs text-rose-500 line-through">${item.base_price}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openItemModal(item)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                      {isLoading ? "Loading..." : "No items found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "menus" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-zinc-900 flex items-center gap-2">
              <LayoutTemplate className="text-emerald-600" />
              Menu Templates
            </h2>
            <button 
              onClick={() => openMenuModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Menu
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map(menu => (
              <div key={menu.id} className="border border-zinc-200 rounded-lg p-5 bg-zinc-50">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-zinc-900">{menu.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openMenuModal(menu)} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMenu(menu.id)} className="text-rose-600 hover:bg-rose-100 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 mb-2">{menu.items?.length || 0} items included</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {menu.items?.slice(0, 5).map((itemId: string) => {
                    const item = items.find(i => i.id === itemId);
                    if (!item) return null;
                    return <span key={itemId} className="text-[10px] bg-white border border-zinc-200 px-2 py-1 rounded text-zinc-700 truncate max-w-[100px]">{item.item_name}</span>;
                  })}
                  {(menu.items?.length || 0) > 5 && <span className="text-[10px] bg-zinc-100 px-2 py-1 rounded text-zinc-500">+{menu.items.length - 5} more</span>}
                </div>
              </div>
            ))}
            {menus.length === 0 && (
              <div className="col-span-full text-center py-10 text-zinc-500 bg-zinc-50 rounded border border-dashed border-zinc-200">
                No menus created yet. Click &quot;Create Menu&quot; to build one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ITEM MODAL --- */}
      {isItemModalOpen && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100">
              <h2 className="text-xl font-serif font-bold text-zinc-900">
                {currentItem.id ? "Edit Item" : "Add New Item"}
              </h2>
              <button onClick={closeItemModal} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Item Name *</label>
                    <input 
                      required type="text" 
                      value={currentItem.item_name} 
                      onChange={e => setCurrentItem({...currentItem, item_name: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                    <select
                      value={currentItem.category || "Other"}
                      onChange={e => setCurrentItem({...currentItem, category: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="Small Plates">Small Plates</option>
                      <option value="Salads">Salads</option>
                      <option value="Pasta">Pasta</option>
                      <option value="Mains">Mains</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Cocktails">Cocktails</option>
                      <option value="Wine">Wine</option>
                      <option value="Beer & Zero-Proof">Beer & Zero-Proof</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Base Price ($)</label>
                      <input 
                        type="number" step="0.01" 
                        value={currentItem.base_price || ""} 
                        onChange={e => setCurrentItem({...currentItem, base_price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Current Price ($)</label>
                      <input 
                        type="number" step="0.01" 
                        value={currentItem.current_price || ""} 
                        onChange={e => setCurrentItem({...currentItem, current_price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Image (50x50 optional)</label>
                    <div className="flex items-center gap-4">
                      {imageFile ? (
                        <div className="w-16 h-16 rounded overflow-hidden border border-zinc-200">
                          <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : currentItem.image_url ? (
                        <div className="w-16 h-16 rounded overflow-hidden border border-zinc-200">
                          <img src={currentItem.image_url} alt="Current" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-400">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded transition-colors"
                        >
                          Choose Image
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                    <textarea 
                      rows={3}
                      value={currentItem.description || ""} 
                      onChange={e => setCurrentItem({...currentItem, description: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 resize-none" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={closeItemModal} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-md font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MENU MODAL --- */}
      {isMenuModalOpen && currentMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100 flex-shrink-0">
              <h2 className="text-xl font-serif font-bold text-zinc-900">
                {currentMenu.id ? "Edit Menu Template" : "Create Menu Template"}
              </h2>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMenu} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-zinc-100 flex-shrink-0">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Menu Name *</label>
                <input 
                  required type="text" 
                  placeholder="e.g. Daily Specials, Winter Menu..."
                  value={currentMenu.name} 
                  onChange={e => setCurrentMenu({...currentMenu, name: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" 
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">Select Items for this Menu</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map(item => {
                    const isSelected = selectedItemsForMenu.has(item.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          const newSet = new Set(selectedItemsForMenu);
                          if (isSelected) newSet.delete(item.id);
                          else newSet.add(item.id);
                          setSelectedItemsForMenu(newSet);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-zinc-200 hover:border-emerald-300'}`}
                      >
                        <div className={`w-5 h-5 rounded-sm border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-zinc-300'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 truncate">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-zinc-900'}`}>{item.item_name}</p>
                          <p className="text-xs text-zinc-500 truncate">{item.category}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 p-6 border-t border-zinc-100 bg-white flex-shrink-0">
                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-md font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors">Save Menu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

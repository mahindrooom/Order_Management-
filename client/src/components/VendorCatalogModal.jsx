import React, { useState, useEffect } from 'react';
import { Package, Check, X, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VendorCatalogModal({ 
  isOpen, 
  onClose, 
  vendor, 
  skuMaster = [], 
  onSaveCatalog 
}) {
  const [selectedSkus, setSelectedSkus] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vendor && vendor.supplied_skus) {
      setSelectedSkus([...vendor.supplied_skus]);
    } else {
      setSelectedSkus([]);
    }
  }, [vendor, isOpen]);

  if (!isOpen || !vendor) return null;

  const toggleSku = (skuCode) => {
    if (selectedSkus.includes(skuCode)) {
      setSelectedSkus(selectedSkus.filter(s => s !== skuCode));
    } else {
      setSelectedSkus([...selectedSkus, skuCode]);
    }
  };

  const handleSelectAllCategory = (category) => {
    const categorySkus = skuMaster
      .filter(s => category === 'ALL' || s.category === category)
      .map(s => s.sku_code);
    
    const allSelected = categorySkus.every(c => selectedSkus.includes(c));
    if (allSelected) {
      // Unselect all in this category
      setSelectedSkus(selectedSkus.filter(s => !categorySkus.includes(s)));
    } else {
      // Select all in this category
      const merged = Array.from(new Set([...selectedSkus, ...categorySkus]));
      setSelectedSkus(merged);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveCatalog(vendor.id, selectedSkus);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const categories = ['ALL', ...new Set(skuMaster.map(s => s.category))];

  const filteredMaster = skuMaster.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Package size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>My Supply Catalogue</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {selectedSkus.length} Selected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select only the articles you supply. Your portal will hide items not in this list.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search articles in catalog..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                    filterCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Showing {filteredMaster.length} master articles</span>
            <button
              onClick={() => handleSelectAllCategory(filterCategory)}
              className="text-emerald-400 hover:underline font-semibold"
            >
              Toggle All in "{filterCategory}"
            </button>
          </div>
        </div>

        {/* SKU Checkbox List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
          {filteredMaster.map((item) => {
            const isChecked = selectedSkus.includes(item.sku_code);

            return (
              <div
                key={item.sku_code}
                onClick={() => toggleSku(item.sku_code)}
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                  isChecked
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-slate-700 bg-slate-900'
                  }`}>
                    {isChecked && <Check size={13} />}
                  </div>

                  <div>
                    <div className="font-semibold text-sm text-white">{item.item_name}</div>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="font-mono text-slate-500 text-[10px]">{item.sku_code}</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400">
                        {item.category}
                      </span>
                      <span className="text-slate-400 text-[11px]">Benchmark: ₹{item.benchmark_rate}/{item.unit}</span>
                    </div>
                  </div>
                </div>

                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  isChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {isChecked ? 'Supplying' : 'Not Supplying'}
                </span>
              </div>
            );
          })}

          {filteredMaster.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching articles found in master catalog.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {selectedSkus.length === 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle size={14} /> At least 1 item recommended
              </span>
            ) : (
              <span>Your portal will show requirements for these <strong>{selectedSkus.length}</strong> items.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
            >
              {saving ? 'Saving...' : 'Save My Catalogue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

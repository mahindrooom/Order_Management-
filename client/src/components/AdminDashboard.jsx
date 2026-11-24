import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  Send, RefreshCw, Upload, Download, Bell, ShieldAlert,
  Search, Filter, ChevronRight, UserCheck, XCircle, Database, Plus, Check
} from 'lucide-react';

export default function AdminDashboard({ 
  indent, 
  summary, 
  vendors, 
  logs, 
  onBroadcastSOS, 
  onReset, 
  onOpenUpload,
  onSimulate5AMBackout 
}) {
  const [activeSubTab, setActiveSubTab] = useState('indent'); // 'indent' or 'sku_master'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // SKU Master state
  const [skuMaster, setSkuMaster] = useState([]);
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [newSku, setNewSku] = useState({
    sku_code: '',
    item_name: '',
    category: 'Vegetables',
    unit: 'kg',
    benchmark_rate: '',
    mandi_spec: ''
  });

  const fetchSkuMaster = async () => {
    try {
      const res = await fetch('/api/sku-master');
      const data = await res.json();
      setSkuMaster(data);
    } catch (e) {
      console.error('Failed to load SKU Master:', e);
    }
  };

  useEffect(() => {
    fetchSkuMaster();
  }, []);

  const handleCreateSku = async (e) => {
    e.preventDefault();
    if (!newSku.sku_code || !newSku.item_name) return;

    try {
      const res = await fetch('/api/sku-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSku)
      });
      if (res.ok) {
        setIsAddSkuOpen(false);
        setNewSku({ sku_code: '', item_name: '', category: 'Vegetables', unit: 'kg', benchmark_rate: '', mandi_spec: '' });
        fetchSkuMaster();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = (indent?.items || []).filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['ALL', ...new Set((indent?.items || []).map(i => i.category))];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Live Indent Session</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Generated 12:30 AM Nightly</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            {indent?.title || 'Daily Procurement Indent'}
          </h2>
          <p className="text-sm text-slate-400">
            Real-time multi-vendor allocation engine with SKU Master matching & instant shortfall notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-sm"
          >
            <Upload size={16} />
            <span>Upload Indent (CSV/JSON)</span>
          </button>

          <a
            href="/api/export-po"
            download
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow-sm"
          >
            <Download size={16} />
            <span>Export Morning PO</span>
          </a>

          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
            title="Reset to default 12:30 AM Indent sample"
          >
            <RefreshCw size={15} />
            <span>Reset Sample</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fill Rate KPI */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Fill Rate</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summary.fill_rate_pct}%
            </span>
            <span className="text-xs text-slate-400">
              ({summary.total_allocated_kg} / {summary.total_demand_kg} kg)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                summary.fill_rate_pct >= 90 ? 'bg-emerald-500' :
                summary.fill_rate_pct >= 60 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, summary.fill_rate_pct)}%` }}
            ></div>
          </div>
        </div>

        {/* Shortfall Risk KPI */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining Shortfall</span>
            <AlertTriangle size={18} className={summary.total_remaining_kg > 0 ? 'text-amber-400' : 'text-slate-600'} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${summary.total_remaining_kg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {summary.total_remaining_kg} <span className="text-lg font-normal">kg</span>
            </span>
            <span className="text-xs text-slate-400">uncommitted</span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <Clock size={12} />
            <span>Mandi Gate Cutoff: 06:30 AM</span>
          </p>
        </div>

        {/* SKU Fulfillment Status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SKUs Fulfilled</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summary.fulfilled_skus} <span className="text-slate-500 text-lg font-normal">/ {summary.total_skus}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {summary.total_skus - summary.fulfilled_skus} SKUs still open for supply
          </p>
        </div>

        {/* SKU Master Catalog Count */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SKU Master Catalog</span>
            <Database size={18} className="text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {skuMaster.length}
            </span>
            <span className="text-xs text-slate-400">registered articles</span>
          </div>
          <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Auto-matching active</span>
          </p>
        </div>
      </div>

      {/* Sub Tabs: Live Indent vs SKU Master */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('indent')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'indent'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span>Live Indent Demand Board</span>
          <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
            {indent?.items?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('sku_master')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'sku_master'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Database size={13} />
          <span>SKU Master Catalog & Matcher</span>
          <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
            {skuMaster.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: Live Indent View */}
      {activeSubTab === 'indent' && (
        <div className="space-y-6">
          {/* Real-Time Shortfall & Release Watchdog Banner */}
          <div className="bg-gradient-to-r from-amber-950/40 via-red-950/20 to-slate-900 border border-amber-800/40 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                  <span>Real-Time Shortfall & Demand Release Watchdog</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Automated Immediate Safeguard
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                  Whenever any supplier releases stock, cancels, or reports a shortfall at any time, the engine instantly returns the stock to the open demand pool, alerts Pluckk, and notifies alternative suppliers.
                </p>
              </div>
            </div>

            <button
              onClick={onSimulate5AMBackout}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl transition shadow-sm active:scale-95"
            >
              <AlertTriangle size={14} />
              <span>Simulate Stock Shortfall / Release</span>
            </button>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search article name (e.g. Potato, Onion, Tomato)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <span className="px-2 py-1 text-slate-400 font-medium flex items-center gap-1">
                  <Filter size={12} /> Status:
                </span>
                {['ALL', 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      filterStatus === st 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'PARTIALLY_FULFILLED' ? 'Partial' : st === 'FULFILLED' ? 'Closed' : 'Open'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      filterCategory === cat 
                        ? 'bg-slate-700 text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Indent Articles Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Article / SKU</th>
                    <th className="py-3 px-3">Target Rate</th>
                    <th className="py-3 px-3">Required</th>
                    <th className="py-3 px-4 min-w-[200px]">Fulfillment Progress</th>
                    <th className="py-3 px-3">Remaining Needed</th>
                    <th className="py-3 px-4">Supplier Commitments</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredItems.map((item) => {
                    const pct = Math.round((item.allocated_qty / item.required_qty) * 100);
                    const isFull = item.status === 'FULFILLED';
                    const isPartial = item.status === 'PARTIALLY_FULFILLED';

                    return (
                      <tr key={item.sku_code} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{item.item_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-slate-500">{item.sku_code}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {item.category}
                            </span>
                            {item.matched !== false ? (
                              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                ✓ Master Matched
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                ⚠ Unmatched
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-300 font-medium">
                          ₹{item.target_rate?.toFixed(2)}
                          <span className="text-[11px] text-slate-500">/{item.unit}</span>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-white">
                          {item.required_qty} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-400 font-medium">
                              {item.allocated_qty} {item.unit} ({pct}%)
                            </span>
                            {isFull ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <CheckCircle2 size={12} /> Fulfilled
                              </span>
                            ) : isPartial ? (
                              <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                {item.remaining_qty} {item.unit} Left
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                                Open
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 rounded-full ${
                                isFull ? 'bg-emerald-500' :
                                isPartial ? 'bg-amber-500' : 'bg-slate-700'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            ></div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {item.remaining_qty === 0 ? (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={13} /> 0 {item.unit} (Closed)
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-amber-400">
                              {item.remaining_qty} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.allocations && item.allocations.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.allocations.map((alloc) => (
                                <span
                                  key={alloc.id}
                                  className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                    alloc.status === 'BACKED_OUT'
                                      ? 'bg-red-500/10 text-red-400 border-red-500/30 line-through'
                                      : 'bg-slate-800 text-slate-200 border-slate-700'
                                  }`}
                                >
                                  <span>{alloc.vendor_name.split(' ')[0]}:</span>
                                  <strong className={alloc.status === 'BACKED_OUT' ? 'text-red-400' : 'text-emerald-400'}>
                                    {alloc.quantity}{item.unit}
                                  </strong>
                                  {alloc.status === 'BACKED_OUT' && (
                                    <span className="text-[9px] text-red-300 font-normal ml-0.5">(Dropped)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No bids yet</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          {item.remaining_qty > 0 && (
                            <button
                              onClick={() => onBroadcastSOS(item.sku_code)}
                              className="px-2.5 py-1 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition"
                              title="Send high priority SOS message to all suppliers for this SKU"
                            >
                              Send SOS
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No articles found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SKU Master Catalog View */}
      {activeSubTab === 'sku_master' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database size={16} className="text-emerald-400" />
                <span>Pluckk SKU Master Catalog ({skuMaster.length} Items)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every uploaded indent is verified against this database to ensure valid SKU codes and benchmark mandi rates.
              </p>
            </div>

            <button
              onClick={() => setIsAddSkuOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
            >
              <Plus size={14} />
              <span>Add New Master SKU</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Article Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3">Benchmark Rate</th>
                  <th className="py-3 px-4">APMC Mandi Quality Specification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {skuMaster.map((sku) => (
                  <tr key={sku.sku_code} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-xs text-emerald-400 font-semibold">
                      {sku.sku_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {sku.item_name}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-400">
                      <span className="bg-slate-800 px-2 py-0.5 rounded">
                        {sku.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-300">
                      {sku.unit}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-emerald-400">
                      ₹{sku.benchmark_rate?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate">
                      {sku.mandi_spec || 'Standard APMC Grade A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add SKU Modal */}
          {isAddSkuOpen && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white">Add Article to Pluckk Master Catalog</h3>
                  <button onClick={() => setIsAddSkuOpen(false)} className="text-slate-400 hover:text-white text-xs">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSku} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">SKU Code (e.g. PLK-VEG-BEA-13):</label>
                    <input
                      type="text"
                      required
                      placeholder="PLK-VEG-..."
                      value={newSku.sku_code}
                      onChange={(e) => setNewSku({ ...newSku, sku_code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Article Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="French Beans Tender (बीन्स)"
                      value={newSku.item_name}
                      onChange={(e) => setNewSku({ ...newSku, item_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Category:</label>
                      <select
                        value={newSku.category}
                        onChange={(e) => setNewSku({ ...newSku, category: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white"
                      >
                        <option value="Vegetables">Vegetables</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Exotics">Exotics</option>
                        <option value="Leafy">Leafy</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Unit:</label>
                      <input
                        type="text"
                        value={newSku.unit}
                        onChange={(e) => setNewSku({ ...newSku, unit: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-center"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Benchmark Rate (₹):</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="45.00"
                        value={newSku.benchmark_rate}
                        onChange={(e) => setNewSku({ ...newSku, benchmark_rate: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">APMC Mandi Quality Specification:</label>
                    <textarea
                      rows={2}
                      placeholder="Tender pods, no strings, bright green, Grade A"
                      value={newSku.mandi_spec}
                      onChange={(e) => setNewSku({ ...newSku, mandi_spec: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddSkuOpen(false)}
                      className="px-3 py-2 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                    >
                      Save to Master Catalog
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

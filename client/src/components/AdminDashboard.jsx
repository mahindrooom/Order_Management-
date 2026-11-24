import React, { useState } from 'react';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  Send, RefreshCw, Upload, Download, Bell, ShieldAlert,
  Search, Filter, ChevronRight, UserCheck, XCircle
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

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
            Real-time multi-vendor allocation engine with instant shortfall notifications.
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
            href="http://localhost:4000/api/export-po"
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

        {/* Active Suppliers responding */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Suppliers</span>
            <UserCheck size={18} className="text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {vendors.length}
            </span>
            <span className="text-xs text-slate-400">connected via portal</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-emerald-400 font-medium">1-to-1 Channels Active</span>
          </div>
        </div>
      </div>

      {/* 5:00 AM Simulation Banner (Demonstrating the Twist) */}
      <div className="bg-gradient-to-r from-amber-950/40 via-red-950/20 to-slate-900 border border-amber-800/40 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              <span>5:00 AM Mandi Back-Out Watchdog</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Automated Safeguard
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              If a supplier cancels or drops stock at 5 AM while you are asleep, the engine immediately returns the stock to the open pool, alerts alternative suppliers, and marks the shortfall for emergency morning action.
            </p>
          </div>
        </div>

        <button
          onClick={onSimulate5AMBackout}
          className="shrink-0 flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl transition shadow-sm active:scale-95"
        >
          <AlertTriangle size={14} />
          <span>Simulate 5 AM Supplier Dropout</span>
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
  );
}

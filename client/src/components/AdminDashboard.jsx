import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  Send, RefreshCw, Upload, Download, Bell, ShieldAlert,
  Search, Filter, ChevronRight, UserCheck, XCircle, Database, Plus, Check,
  Package, Star, Award, Layers, Users, Edit3, List, LayoutGrid, Phone, Mail, UserPlus, X, ShieldCheck, MessageSquare,
  Zap
} from 'lucide-react';
import VendorCatalogModal from './VendorCatalogModal';

export default function AdminDashboard({ 
  indent, 
  summary, 
  vendors = [], 
  logs = [], 
  onBroadcastSOS, 
  onReset, 
  onOpenUpload,
  onSimulate5AMBackout,
  currentUser,
  skuMaster = [],
  onSaveCatalog,
  onUpdateVendorRatings,
  onAddVendor,
  onTrigger5AmAllocation,
  onReopenBiddingWindow,
  onInitiateFFF,
  onReviewFFF
}) {
  const [activeSubTab, setActiveSubTab] = useState('indent'); // 'indent', 'fastest_finger', 'vendors', 'sku_master'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [fffTabFilter, setFffTabFilter] = useState('ALL');

  // Vendor Catalog & Directory state
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [vendorViewMode, setVendorViewMode] = useState('table'); // 'table' or 'cards'
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03']
  });
  const [editingCatalogVendor, setEditingCatalogVendor] = useState(null);

  // Rating editing state
  const [editingRatingsVendor, setEditingRatingsVendor] = useState(null);
  const [ratingInputs, setRatingInputs] = useState({ quality: 4.8, price: 4.8, fill_rate: 4.8, delivery_time: 4.8 });

  // Add SKU Master modal state
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [newSku, setNewSku] = useState({
    sku_code: '',
    item_name: '',
    category: 'Vegetables',
    unit: 'kg',
    benchmark_rate: '',
    mandi_spec: ''
  });

  const isAdmin = currentUser?.role === 'ADMIN';
  const isSourcing = currentUser?.role === 'SOURCING' || isAdmin;

  const handleCreateVendorSubmit = async (e) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.email) return;
    if (onAddVendor) {
      const res = await onAddVendor(newVendor);
      if (res?.success) {
        setIsAddVendorOpen(false);
        setNewVendor({
          name: '',
          email: '',
          phone: '',
          supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03']
        });
      }
    }
  };

  const filteredVendors = (vendors || []).filter(v => {
    if (!v) return false;
    const term = vendorSearchTerm.trim().toLowerCase();
    if (!term) return true;
    const nameMatch = v.name?.toLowerCase().includes(term);
    const emailMatch = v.email?.toLowerCase().includes(term);
    const phoneMatch = v.phone?.includes(term);
    const skuMatch = (v.supplied_skus || []).some(code => {
      const item = skuMaster.find(s => s.sku_code === code);
      return code.toLowerCase().includes(term) || (item && item.item_name.toLowerCase().includes(term));
    });
    return nameMatch || emailMatch || phoneMatch || skuMatch;
  });

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
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenRatingsModal = (v) => {
    setEditingRatingsVendor(v);
    setRatingInputs({
      quality: v.ratings?.quality || 4.5,
      price: v.ratings?.price || 4.5,
      fill_rate: v.ratings?.fill_rate || 4.5,
      delivery_time: v.ratings?.delivery_time || 4.5
    });
  };

  const handleSaveRatings = async (e) => {
    e.preventDefault();
    if (!editingRatingsVendor) return;

    if (onUpdateVendorRatings) {
      await onUpdateVendorRatings(editingRatingsVendor.id, ratingInputs);
    }
    setEditingRatingsVendor(null);
  };

  const filteredItems = (indent?.items || []).filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['ALL', ...new Set((indent?.items || []).map(i => i.category))];

  const unfulfilledItems = (indent?.items || []).filter(item => item.remaining_qty > 0);
  const activeFffItems = (indent?.items || []).filter(item => item.round2_fff?.status === 'ACTIVE' && item.remaining_qty > 0);
  const fulfilledItems = (indent?.items || []).filter(item => item.remaining_qty === 0);

  const allFffApplications = (indent?.items || []).flatMap(item => {
    return (item.round2_fff?.applications || []).map(app => ({
      ...app,
      sku_code: item.sku_code,
      item_name: item.item_name,
      category: item.category,
      unit: item.unit,
      target_rate: item.target_rate,
      remaining_qty: item.remaining_qty
    }));
  }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const pendingFffCount = allFffApplications.filter(a => a.status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              {isAdmin ? '👑 Executive Admin Console' : '🛒 Sourcing Operations'}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Pluckk Procurement & L1 Allocation Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            {indent?.title || 'Daily Procurement Indent'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Automated minimum price (L1) allocation with vendor rating tie-breakers (Quality, Price, Fill Rate, Delivery Time).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-sm"
          >
            <Upload size={15} />
            <span>Upload Indent (CSV/JSON)</span>
          </button>

          {/* WhatsApp Live Alert Broadcast for Mandi Vendors */}
          <button
            onClick={() => {
              const url = window.location.origin;
              const text = encodeURIComponent(
                `🥬 *PLUCCK MANDI INDENT RELEASED (12:30 AM)*\n\nDaily fresh produce requirements are now open for bidding on Pluckk Supplier Portal.\n\n👉 Open App & Submit Quote: ${url}\n\n_Note: You will only see articles mapped to your supply catalogue._`
              );
              window.open(`https://wa.me/?text=${text}`, '_blank');
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl transition shadow-sm"
            title="Broadcast live indent announcement to suppliers on WhatsApp"
          >
            <MessageSquare size={15} />
            <span>WhatsApp Mandi Alert</span>
          </button>

          <a
            href="/api/export-po"
            download
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow-sm"
          >
            <Download size={15} />
            <span>Export Morning PO</span>
          </a>

          {isAdmin && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
              title="Reset to default 12:30 AM sample"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ⏰ 5:00 AM Bidding Window Command & Control Bar */}
      <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
        indent?.bidding_window?.status === 'LOCKED'
          ? 'bg-slate-900 border-amber-500/40 text-amber-200'
          : 'bg-slate-900 border-emerald-500/40 text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
            indent?.bidding_window?.status === 'LOCKED'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            <Clock size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {indent?.bidding_window?.status === 'LOCKED' 
                  ? '🔒 5:00 AM Bidding Window: CLOSED & LOCKED' 
                  : '🟢 5:00 AM Bidding Window: OPEN (Awaiting 5:00 AM)'}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                indent?.bidding_window?.status === 'LOCKED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
              }`}>
                {indent?.bidding_window?.status === 'LOCKED' ? 'Bids Locked' : 'Suppliers Can Adjust Quotes'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {indent?.bidding_window?.status === 'LOCKED'
                ? 'System evaluated all submitted quotes and locked allocations at 5:00 AM based on minimum price (L1) and vendor ratings.'
                : 'Suppliers are submitting and adjusting quotes. System will wait till 5:00 AM to accept lowest pricing and lock allocations.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {indent?.bidding_window?.status === 'LOCKED' ? (
            <button
              onClick={onReopenBiddingWindow}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 shadow-sm"
              title="Reopen window so suppliers can quote or adjust prices again"
            >
              <RefreshCw size={14} />
              <span>Reopen Bidding Window</span>
            </button>
          ) : (
            <button
              onClick={onTrigger5AmAllocation}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 shadow-emerald-950/40"
              title="Close window now, accept lowest-price bids (L1), and lock allocations"
            >
              <Zap size={14} />
              <span>⚡ Execute 5:00 AM Allocation Now</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fill Rate KPI */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
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
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unfulfilled Shortfall</span>
            <AlertTriangle size={18} className={summary.total_remaining_kg > 0 ? 'text-amber-400' : 'text-slate-600'} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${summary.total_remaining_kg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {summary.total_remaining_kg} <span className="text-lg font-normal">kg</span>
            </span>
            <span className="text-xs text-slate-400">open demand</span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <Clock size={12} />
            <span>Real-time dynamic re-award active</span>
          </p>
        </div>

        {/* Total Estimated Cost */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Committed PO Value</span>
            <Award size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              ₹{(summary.total_estimated_cost || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-emerald-400 mt-3">
            Optimized via Lowest Price (L1) Engine
          </p>
        </div>

        {/* Registered Suppliers (Clickable to switch tab) */}
        <div 
          onClick={() => setActiveSubTab('vendors')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-3xl cursor-pointer transition group shadow-sm"
          title="Click to view full Vendors Directory"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-emerald-400 transition">
              Active Suppliers (Click to View)
            </span>
            <Users size={18} className="text-teal-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {vendors.length}
            </span>
            <span className="text-xs text-slate-400">mapped with catalogues</span>
          </div>
          <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1 font-medium">
            <span>View All Suppliers & Catalogues →</span>
          </p>
        </div>
      </div>

      {/* Sub Tabs: Indent Bidding vs Suppliers Catalog & Ratings vs SKU Master */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('indent')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'indent'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Layers size={14} />
          <span>Live Indent & L1 Bidding Board</span>
          <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
            {indent?.items?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('fastest_finger')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'fastest_finger'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-300 hover:text-white bg-amber-950/20 border border-amber-500/30'
          }`}
        >
          <Zap size={14} className={pendingFffCount > 0 ? 'animate-bounce text-amber-300' : 'text-amber-400'} />
          <span>⚡ 5 AM Shortfalls & Fastest Finger (Round 2)</span>
          {pendingFffCount > 0 ? (
            <span className="px-2 py-0.5 bg-red-600 text-white animate-pulse rounded-full text-[10px] font-bold">
              {pendingFffCount} Pending Review
            </span>
          ) : unfulfilledItems.length > 0 ? (
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px]">
              {unfulfilledItems.length} Shortfalls
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">
              100% Fulfilled
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('vendors')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'vendors'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Users size={14} />
          <span>Vendors Directory & Catalogues</span>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
            {vendors.length} Vendors
          </span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab('sku_master')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'sku_master'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Database size={14} />
            <span>SKU Master Catalog & Matcher</span>
            <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
              {skuMaster.length}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: Live Indent & L1 Bidding Board */}
      {activeSubTab === 'indent' && (
        <div className="space-y-5">
          {/* Real-Time Shortfall & Release Watchdog Banner */}
          <div className="bg-gradient-to-r from-amber-950/40 via-red-950/20 to-slate-900 border border-amber-800/40 rounded-3xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                  <span>Real-Time Shortfall & Demand Release Watchdog</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Continuous
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                  Whenever any supplier releases stock, cancels, or reports a shortfall at any time, the L1 engine automatically recalculates and awards to the next-lowest supplier or opens remaining demand.
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
                className="w-full pl-9.5 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs">
                {['ALL', 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-xl font-medium transition ${
                      filterStatus === st 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'PARTIALLY_FULFILLED' ? 'Partial' : st === 'FULFILLED' ? 'Closed' : 'Open'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl font-medium transition ${
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Article / SKU</th>
                    <th className="py-3 px-3">Target Rate</th>
                    <th className="py-3 px-3">Avg Procured</th>
                    <th className="py-3 px-3">Required</th>
                    <th className="py-3 px-4 min-w-[180px]">Fulfillment Progress</th>
                    <th className="py-3 px-3">Remaining</th>
                    <th className="py-3 px-4 min-w-[280px]">Live Supplier Bids & L1 Allocations</th>
                    <th className="py-3 px-3 text-right">Action</th>
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
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {item.category}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-300 font-medium">
                          ₹{item.target_rate?.toFixed(2)}
                          <span className="text-[10px] text-slate-500">/{item.unit}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          {item.avg_procured_rate > 0 ? (
                            <span className="text-xs font-bold text-emerald-400">
                              ₹{item.avg_procured_rate}
                              <span className="text-[10px] text-slate-500">/{item.unit}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
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
                              <CheckCircle2 size={13} /> Closed
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-amber-400">
                              {item.remaining_qty} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                            </span>
                          )}
                        </td>

                        {/* Live Bids & L1 Winning Allocations */}
                        <td className="py-3.5 px-4">
                          {item.bids && item.bids.length > 0 ? (
                            <div className="space-y-1.5">
                              {item.bids.map((b) => (
                                <div
                                  key={b.id}
                                  className={`text-xs px-2.5 py-1 rounded-xl border flex items-center justify-between gap-2 ${
                                    b.status === 'BACKED_OUT'
                                      ? 'bg-red-500/10 text-red-400 border-red-500/30 line-through'
                                      : b.allocated_qty > 0
                                      ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30'
                                      : 'bg-slate-800/80 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  <div>
                                    <span className="font-semibold text-white">{b.vendor_name.split(' ')[0]}</span>
                                    <span className="text-[11px] text-slate-400 ml-1">quoted ₹{b.quoted_rate}</span>
                                  </div>

                                  <div>
                                    {b.allocated_qty > 0 ? (
                                      <span className="font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded text-[11px]">
                                        Awarded {b.allocated_qty} {item.unit}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                                        Outbid
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Awaiting quotes</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          {item.remaining_qty > 0 && (
                            <button
                              onClick={() => onBroadcastSOS(item.sku_code)}
                              className="px-2.5 py-1 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition"
                              title="Broadcast urgent SOS to suppliers"
                            >
                              Send SOS
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: 5 AM Shortfalls & Fastest Finger (Round 2) */}
      {activeSubTab === 'fastest_finger' && (
        <div className="space-y-6">
          {/* Executive Round 2 Banner */}
          <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Zap size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>5:00 AM Shortfall Resolution & Fastest Finger First (Round 2)</span>
                  </h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Round 2 Live
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  As the clock hits 5:00 AM, primary lowest-price (L1) bids are locked. Unfulfilled items below can be re-initiated for <strong>Fastest Finger First</strong>. Any supplier who applies first appears in Chart 2 with millisecond precision for instant <strong>Accept</strong> or <strong>Reject</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {unfulfilledItems.length > 0 && (
                <button
                  onClick={() => onInitiateFFF && onInitiateFFF(null)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-2 active:scale-95"
                >
                  <Zap size={15} />
                  <span>⚡ Re-initiate All {unfulfilledItems.length} Shortfalls (FFF)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Indent Articles</span>
              <span className="text-2xl font-black text-white mt-1 block">{(indent?.items || []).length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Fulfilled at 5:00 AM</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{fulfilledItems.length} articles</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Unfulfilled Shortfalls</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">{unfulfilledItems.length} articles</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">Live FFF Queue</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block">{allFffApplications.length} applications</span>
            </div>
          </div>

          {/* CHART 1: 5 AM Fulfillment & Shortfall Re-initiation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📊 Chart 1: 5 AM Fulfillment Status & Shortfall List</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                    Primary 5 AM Allocations
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shows fulfilled articles vs remaining shortfall needed. Click "Re-initiate Bid" to reopen the fastest finger window for any item.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {['ALL', 'SHORTFALLS', 'ACTIVE_FFF', 'FULFILLED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFffTabFilter(f)}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      fffTabFilter === f
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'ALL' ? 'All Articles' : f === 'SHORTFALLS' ? `Shortfalls (${unfulfilledItems.length})` : f === 'ACTIVE_FFF' ? `Active FFF (${activeFffItems.length})` : `100% Fulfilled (${fulfilledItems.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">Article & SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Target Demand</th>
                    <th className="py-3 px-3 text-right">5 AM Allocated</th>
                    <th className="py-3 px-3 text-right">Shortfall Needed</th>
                    <th className="py-3 px-3 text-right">Benchmark Rate</th>
                    <th className="py-3 px-3 text-center">Round 2 Status</th>
                    <th className="py-3 px-3 text-right">Fastest Finger Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(indent?.items || [])
                    .filter(item => {
                      if (fffTabFilter === 'SHORTFALLS') return item.remaining_qty > 0;
                      if (fffTabFilter === 'ACTIVE_FFF') return item.round2_fff?.status === 'ACTIVE' && item.remaining_qty > 0;
                      if (fffTabFilter === 'FULFILLED') return item.remaining_qty === 0;
                      return true;
                    })
                    .map((item) => {
                      const isFulfilled = item.remaining_qty === 0;
                      const isFffActive = item.round2_fff?.status === 'ACTIVE';
                      const fffApps = item.round2_fff?.applications || [];

                      return (
                        <tr key={item.sku_code} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-white text-sm block">{item.item_name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{item.sku_code}</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-slate-300">
                            {item.required_qty} {item.unit}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                            {item.allocated_qty || 0} {item.unit}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {isFulfilled ? (
                              <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 size={13} /> Fulfilled
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg">
                                {item.remaining_qty} {item.unit} Shortfall
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-300">
                            ₹{item.target_rate}/{item.unit}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {isFulfilled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                100% Closed
                              </span>
                            ) : isFffActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                ⚡ FFF ACTIVE ({fffApps.length} in queue)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                Idle (Waiting Sourcing)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {isFulfilled ? (
                              <span className="text-xs text-slate-500 italic">No action needed</span>
                            ) : isFffActive ? (
                              <button
                                onClick={() => onInitiateFFF && onInitiateFFF(item.sku_code)}
                                className="px-3 py-1.5 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl transition"
                                title="Re-broadcast announcement to suppliers"
                              >
                                ⚡ Re-alert Suppliers ({fffApps.length})
                              </button>
                            ) : (
                              <button
                                onClick={() => onInitiateFFF && onInitiateFFF(item.sku_code)}
                                className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 ml-auto"
                              >
                                <Zap size={13} />
                                <span>Reinitiate Bid (Fastest Finger)</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHART 2: Live Fastest Finger First (FFF) Applications Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚡ Chart 2: Live Fastest Finger First (FFF) Applications Queue</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Real-Time Arrival Order (Fastest First)
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ordered strictly by arrival timestamp with millisecond accuracy. Sourcing & Admin can immediately <strong>Accept</strong> to lock allocation or <strong>Reject</strong> to pass to the next fastest applicant.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Total Applications:</span>
                <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                  {allFffApplications.length}
                </span>
                {pendingFffCount > 0 && (
                  <span className="font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-xl animate-pulse">
                    {pendingFffCount} Pending Review
                  </span>
                )}
              </div>
            </div>

            {allFffApplications.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <Clock size={24} />
                </div>
                <h5 className="text-sm font-bold text-white">No Fastest Finger Applications Yet</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you re-initiate shortfalls above, registered suppliers receive emergency alerts and apply. The first supplier to apply appears here immediately at the top of the queue.
                </p>
                {unfulfilledItems.length > 0 && (
                  <button
                    onClick={() => onInitiateFFF && onInitiateFFF(null)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    ⚡ Re-initiate Shortfalls for Fastest Finger
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-3">Queue Rank</th>
                      <th className="py-3 px-3">Arrival Timestamp</th>
                      <th className="py-3 px-3">Article / SKU</th>
                      <th className="py-3 px-3">Applicant Supplier</th>
                      <th className="py-3 px-3 text-right">Offered Quantity</th>
                      <th className="py-3 px-3 text-right">Quoted Rate</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Sourcing Decision Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allFffApplications.map((app, index) => {
                      const isPending = app.status === 'PENDING_APPROVAL';
                      const isAccepted = app.status === 'ACCEPTED';
                      const isRejected = app.status === 'REJECTED';
                      const isFastest = index === 0;

                      return (
                        <tr 
                          key={app.id || index} 
                          className={`transition ${
                            isFastest && isPending 
                              ? 'bg-amber-950/20 hover:bg-amber-950/30' 
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Queue Rank */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                index === 0 
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                                  : index === 1 
                                  ? 'bg-slate-300 text-slate-900' 
                                  : index === 2 
                                  ? 'bg-amber-700 text-white' 
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                #{index + 1}
                              </span>
                              {index === 0 && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                  FASTEST
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Arrival Timestamp (with Millisecond Accuracy) */}
                          <td className="py-3.5 px-3">
                            <span className="font-mono text-xs text-white font-semibold block">
                              {app.received_time || (app.timestamp ? new Date(app.timestamp).toLocaleTimeString() : 'Just now')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {app.timestamp ? new Date(app.timestamp).toLocaleDateString() : ''}
                            </span>
                          </td>

                          {/* Article */}
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-white text-sm block">{app.item_name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{app.sku_code}</span>
                          </td>

                          {/* Supplier */}
                          <td className="py-3.5 px-3">
                            <span className="font-semibold text-slate-200 block">{app.vendor_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {app.vendor_id}</span>
                          </td>

                          {/* Offered Qty */}
                          <td className="py-3.5 px-3 text-right font-bold text-white text-sm">
                            {app.quantity} {app.unit}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              (Shortfall: {app.remaining_qty} {app.unit})
                            </span>
                          </td>

                          {/* Quoted Rate */}
                          <td className="py-3.5 px-3 text-right">
                            <span className="font-mono font-bold text-emerald-400 text-sm block">
                              ₹{app.quoted_rate}/{app.unit}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Bench: ₹{app.target_rate}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center">
                            {isPending && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                ⏳ Pending Approval
                              </span>
                            )}
                            {isAccepted && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✅ Accepted ({app.allocated_qty || app.quantity} {app.unit})
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                ❌ Rejected
                              </span>
                            )}
                          </td>

                          {/* Action Buttons: Accept / Reject */}
                          <td className="py-3.5 px-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => onReviewFFF && onReviewFFF(app.sku_code, app.id, 'ACCEPT')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center gap-1"
                                  title="Accept this application and lock allocation"
                                >
                                  <Check size={13} />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => onReviewFFF && onReviewFFF(app.sku_code, app.id, 'REJECT')}
                                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-xl text-xs transition active:scale-95 flex items-center gap-1"
                                  title="Reject application and allow next fastest applicant"
                                >
                                  <X size={13} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : isAccepted ? (
                              <div className="text-right">
                                <span className="text-[11px] font-semibold text-emerald-400 block">
                                  Allocated by {app.reviewed_by || 'Sourcing'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {app.reviewed_at ? new Date(app.reviewed_at).toLocaleTimeString() : 'Approved'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="text-[11px] font-semibold text-red-400 block">
                                  Rejected by {app.reviewed_by || 'Sourcing'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {app.reviewed_at ? new Date(app.reviewed_at).toLocaleTimeString() : 'Closed'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Registered Vendors Directory & Catalogues */}
      {activeSubTab === 'vendors' && (
        <div className="space-y-4">
          {/* Header Controls: Title, Search, View Switcher, Add Vendor */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                <span>Registered Suppliers & Mandi Directory</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {filteredVendors.length} of {vendors.length} Vendors
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All suppliers verified for Pluckk procurement. Indents are distributed based on what each vendor supplies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Vendor */}
              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search vendor, email, article..."
                  value={vendorSearchTerm}
                  onChange={(e) => setVendorSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* View Mode Toggle (Table / List vs Cards) */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setVendorViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    vendorViewMode === 'table'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="List / Table View"
                >
                  <List size={14} />
                  <span>List View</span>
                </button>
                <button
                  onClick={() => setVendorViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    vendorViewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid size={14} />
                  <span>Cards View</span>
                </button>
              </div>

              {/* Add New Vendor Button */}
              <button
                onClick={() => setIsAddVendorOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <UserPlus size={14} />
                <span>+ Onboard Vendor</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: Table / List View (Clean Data List of all Vendors) */}
          {vendorViewMode === 'table' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3.5 px-4">Supplier & ID</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Supply Catalogue</th>
                      <th className="py-3.5 px-4 text-center">Quality</th>
                      <th className="py-3.5 px-4 text-center">Price</th>
                      <th className="py-3.5 px-4 text-center">Fill Rate</th>
                      <th className="py-3.5 px-4 text-center">Delivery</th>
                      <th className="py-3.5 px-4 text-center">Composite Score</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredVendors.map((v) => {
                      const ratings = v.ratings || { quality: 4.5, price: 4.5, fill_rate: 4.5, delivery_time: 4.5 };
                      const composite = v.compositeRating || 4.5;
                      const suppliedCount = (v.supplied_skus || []).length;

                      return (
                        <tr key={v.id} className="hover:bg-slate-800/40 transition">
                          {/* Supplier Name & Badge */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{v.name}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                                {v.id}
                              </span>
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-md font-medium">
                              ✓ 1-to-1 Verified
                            </span>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-300 font-mono text-xs flex items-center gap-1">
                              <Mail size={12} className="text-slate-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{v.email}</span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1 font-mono">
                              <Phone size={11} className="text-slate-500 shrink-0" />
                              <span>{v.phone || '+91 98xxx xxxxx'}</span>
                            </div>
                          </td>

                          {/* Supply Catalogue */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Package size={13} className="text-emerald-400 shrink-0" />
                              <span className="font-semibold text-slate-200">{suppliedCount} articles</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(v.supplied_skus || []).slice(0, 3).map((code) => {
                                const item = skuMaster.find(s => s.sku_code === code);
                                return (
                                  <span key={code} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                    {item ? item.item_name.split(' ')[0] : code}
                                  </span>
                                );
                              })}
                              {suppliedCount > 3 && (
                                <span className="text-[10px] text-slate-400 bg-slate-800/60 px-1 py-0.5 rounded">
                                  +{suppliedCount - 3} more
                                </span>
                              )}
                              {suppliedCount === 0 && (
                                <span className="text-[11px] text-slate-500 italic">No articles mapped</span>
                              )}
                            </div>
                          </td>

                          {/* 4 Pillars */}
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-300">
                            ★{ratings.quality}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-300">
                            ★{ratings.price}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-300">
                            ★{ratings.fill_rate}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-300">
                            ★{ratings.delivery_time}
                          </td>

                          {/* Composite Rating */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-xl">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>{composite}</span>
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingCatalogVendor(v)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/30 transition flex items-center gap-1"
                                title="Manage what articles this vendor supplies"
                              >
                                <Package size={12} />
                                <span>Catalogue</span>
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleOpenRatingsModal(v)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition flex items-center gap-1"
                                  title="Adjust 4-Pillar Ratings"
                                >
                                  <Star size={12} className="text-amber-400" />
                                  <span>Ratings</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredVendors.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <Users size={32} className="mx-auto text-slate-600 mb-2" />
                          <p className="text-sm font-semibold">No suppliers found matching "{vendorSearchTerm}"</p>
                          <p className="text-xs text-slate-500 mt-1">Try a different name, email, or click "+ Onboard Vendor" to register them.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: Cards View (Visual 4-Pillar Metric Cards) */}
          {vendorViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVendors.map((v) => {
                const ratings = v.ratings || { quality: 4.5, price: 4.5, fill_rate: 4.5, delivery_time: 4.5 };
                const composite = v.compositeRating || 4.5;
                const suppliedCount = (v.supplied_skus || []).length;

                return (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm hover:border-slate-700 transition">
                    {/* Top: Name, Contact & Composite Score */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{v.name}</h4>
                          <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                            {v.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{v.email} • {v.phone || '+91 98xxx xxxxx'}</p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-amber-400 font-bold text-base bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-xl">
                          <Star size={15} className="fill-amber-400 text-amber-400" />
                          <span>{composite}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Composite Score</span>
                      </div>
                    </div>

                    {/* 4 Rating Pillars Breakdown */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Quality</span>
                        <strong className="text-xs text-white">★{ratings.quality}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Price</span>
                        <strong className="text-xs text-white">★{ratings.price}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Fill Rate</span>
                        <strong className="text-xs text-white">★{ratings.fill_rate}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Delivery</span>
                        <strong className="text-xs text-white">★{ratings.delivery_time}</strong>
                      </div>
                    </div>

                    {/* Supply Catalog Summary */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                          <Package size={14} className="text-emerald-400" />
                          <span>Supply Catalogue ({suppliedCount} Articles)</span>
                        </span>

                        <button
                          onClick={() => setEditingCatalogVendor(v)}
                          className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                        >
                          <Edit3 size={12} />
                          <span>Edit Catalogue</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {(v.supplied_skus || []).map((code) => {
                          const item = skuMaster.find(s => s.sku_code === code);
                          return (
                            <span key={code} className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-lg">
                              {item ? item.item_name.split(' ')[0] : code}
                            </span>
                          );
                        })}
                        {suppliedCount === 0 && (
                          <span className="text-xs text-slate-500 italic">No articles mapped yet. Click Edit to map.</span>
                        )}
                      </div>
                    </div>

                    {/* Admin Action: Adjust 4 Pillars */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => handleOpenRatingsModal(v)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <span>Adjust 4-Pillar Ratings</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal: Onboard / Add New Vendor */}
          {isAddVendorOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <UserPlus size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Onboard New Supplier</h3>
                      <p className="text-xs text-slate-400">Add a new Mandi trader or supplier to Pluckk</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAddVendorOpen(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateVendorSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Supplier / Trader Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mahindroo Fresh Produce / Ramesh Mandi"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Supplier Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="vendor@gmail.com or mandi@yahoo.com"
                      value={newVendor.email}
                      onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Non-pluckk emails automatically receive restricted 1-to-1 Supplier portal view.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98200 xxxxx"
                      value={newVendor.phone}
                      onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Initial Supply Catalogue (Select items they supply):
                    </label>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                      {skuMaster.map((sku) => {
                        const checked = newVendor.supplied_skus.includes(sku.sku_code);
                        return (
                          <label
                            key={sku.sku_code}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                              checked ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-900'
                            }`}
                          >
                            <span className="font-medium">{sku.item_name}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const list = checked
                                  ? newVendor.supplied_skus.filter(c => c !== sku.sku_code)
                                  : [...newVendor.supplied_skus, sku.sku_code];
                                setNewVendor({ ...newVendor, supplied_skus: list });
                              }}
                              className="accent-emerald-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddVendorOpen(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition"
                    >
                      Onboard Supplier
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Vendor Catalog Modal */}
          {editingCatalogVendor && (
            <VendorCatalogModal
              isOpen={Boolean(editingCatalogVendor)}
              onClose={() => setEditingCatalogVendor(null)}
              vendor={editingCatalogVendor}
              skuMaster={skuMaster}
              onSaveCatalog={onSaveCatalog}
            />
          )}

          {/* Edit Ratings Modal (Admin Only) */}
          {editingRatingsVendor && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white">Adjust Ratings: {editingRatingsVendor.name}</h3>
                  <button onClick={() => setEditingRatingsVendor(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSaveRatings} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Quality Score (1-5):</label>
                      <input
                        type="number"
                        step="0.1"
                        max="5.0"
                        min="1.0"
                        value={ratingInputs.quality}
                        onChange={(e) => setRatingInputs({ ...ratingInputs, quality: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Price Score (1-5):</label>
                      <input
                        type="number"
                        step="0.1"
                        max="5.0"
                        min="1.0"
                        value={ratingInputs.price}
                        onChange={(e) => setRatingInputs({ ...ratingInputs, price: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Fill Rate Score (1-5):</label>
                      <input
                        type="number"
                        step="0.1"
                        max="5.0"
                        min="1.0"
                        value={ratingInputs.fill_rate}
                        onChange={(e) => setRatingInputs({ ...ratingInputs, fill_rate: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Delivery Time (1-5):</label>
                      <input
                        type="number"
                        step="0.1"
                        max="5.0"
                        min="1.0"
                        value={ratingInputs.delivery_time}
                        onChange={(e) => setRatingInputs({ ...ratingInputs, delivery_time: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1">
                    When multiple suppliers quote the exact same rate, the higher composite score automatically wins the order allocation.
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button type="button" onClick={() => setEditingRatingsVendor(null)} className="px-3 py-2 text-slate-400">Cancel</button>
                    <button type="submit" className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">Save Ratings</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SKU Master Catalog View (Admin Only) */}
      {isAdmin && activeSubTab === 'sku_master' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-3xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database size={16} className="text-emerald-400" />
                <span>Pluckk SKU Master Catalog ({skuMaster.length} Items)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Master definitions of all fresh articles, units, benchmark purchase rates, and APMC Mandi quality specifications.
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

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
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
        </div>
      )}
    </div>
  );
}

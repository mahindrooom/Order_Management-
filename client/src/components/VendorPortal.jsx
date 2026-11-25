import React, { useState, useEffect } from 'react';
import { 
  Package, Check, CheckCircle2, AlertCircle, Lock, 
  Send, AlertTriangle, ChevronDown, User, ShieldCheck, 
  Clock, ArrowRight, CornerDownRight, X, TrendingDown, Star,
  Smartphone, Bell, Download, Zap
} from 'lucide-react';
import VendorCatalogModal from './VendorCatalogModal';

export default function VendorPortal({ 
  vendors = [], 
  currentVendorId, 
  onSelectVendor, 
  indent, 
  onConfirmQuantity,
  onBid,
  onBackout, 
  compact = false,
  isRestricted = false,
  currentUser = null,
  skuMaster = [],
  onSaveCatalog,
  onApplyFFF
}) {
  const fallbackVendor = {
    id: currentUser?.vendorId || currentVendorId || 'v1',
    name: currentUser?.name || 'Verified Supplier',
    email: currentUser?.email || 'vendor@pluckk.partner',
    phone: '+91 98xxx xxxxx',
    supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03'],
    ratings: { quality: 4.8, price: 4.8, fill_rate: 4.8, delivery_time: 4.8 },
    compositeRating: 4.8
  };

  const currentVendor = (Array.isArray(vendors) && vendors.find(v => v && (
    v.id === currentVendorId || 
    (currentUser?.vendorId && v.id === currentUser.vendorId) || 
    (currentUser?.email && v.email && v.email.toLowerCase() === currentUser.email.toLowerCase())
  ))) || (Array.isArray(vendors) && vendors[0]) || fallbackVendor;

  const [selectedSku, setSelectedSku] = useState(null);
  const [quotedRate, setQuotedRate] = useState('');
  const [quotedQty, setQuotedQty] = useState('');
  const [backoutReason, setBackoutReason] = useState('');
  const [backoutSku, setBackoutSku] = useState(null);
  const [backoutDropQty, setBackoutDropQty] = useState('');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Round 2: Fastest Finger First State
  const [fffApplyingSku, setFffApplyingSku] = useState(null);
  const [fffQty, setFffQty] = useState('');
  const [fffRate, setFffRate] = useState('');

  const handleFffSubmit = (skuCode) => {
    if (!onApplyFFF || !fffQty || !fffRate) return;
    onApplyFFF(skuCode, parseFloat(fffQty), parseFloat(fffRate));
    setFffApplyingSku(null);
    setFffQty('');
    setFffRate('');
  };

  // PWA Install Prompt & Notification Permissions
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('🔔 Pluckk Mandi Alerts Enabled', {
              body: 'You will receive live sound, buzz & requirement update alerts on your phone!',
              icon: '/favicon.svg',
              vibrate: [200, 100, 200]
            });
          }).catch(() => {
            try {
              new Notification('🔔 Pluckk Mandi Alerts Enabled', {
                body: 'You will receive live sound, buzz & requirement update alerts on your phone!',
                icon: '/favicon.svg'
              });
            } catch (e) {}
          });
        }
      }
    }
  };

  // 5:00 AM Bidding Window State
  const isWindowOpen = indent?.bidding_window ? indent.bidding_window.status === 'OPEN' : true;

  // Filter items: A vendor ONLY sees what is in their supply catalog!
  const mySuppliedSkus = Array.isArray(currentVendor?.supplied_skus) ? currentVendor.supplied_skus : [];
  const visibleItems = (indent?.items || []).filter(item => 
    mySuppliedSkus.length === 0 || mySuppliedSkus.includes(item.sku_code)
  );

  // Find all awarded commitments for this vendor (L1 winning bids accepted after 5:00 AM)
  const myCommitments = (indent?.items || []).flatMap(item => {
    const myBid = (item.bids || []).find(b => b && b.vendor_id === currentVendor?.id && b.status === 'ACTIVE' && b.allocated_qty > 0);
    if (myBid) {
      return [{
        sku_code: item.sku_code,
        item_name: item.item_name,
        unit: item.unit,
        target_rate: item.target_rate,
        quoted_rate: myBid.quoted_rate,
        committed_qty: myBid.allocated_qty,
        total_bid_qty: myBid.quantity,
        timestamp: myBid.timestamp
      }];
    }
    return [];
  });

  const handleStartQuote = (item) => {
    setSelectedSku(item.sku_code);
    const existingBid = (item.bids || []).find(b => b && b.vendor_id === currentVendor?.id && b.status === 'ACTIVE');
    if (existingBid) {
      setQuotedRate(existingBid.quoted_rate.toString());
      setQuotedQty(existingBid.quantity.toString());
    } else {
      setQuotedRate(item.target_rate.toString());
      setQuotedQty(item.remaining_qty > 0 ? item.remaining_qty.toString() : item.required_qty.toString());
    }
  };

  const handleBidSubmit = (sku_code) => {
    const rate = parseFloat(quotedRate);
    const qty = parseFloat(quotedQty);
    if (!rate || rate <= 0 || !qty || qty <= 0) return;

    const vId = currentVendor?.id || currentUser?.vendorId || 'v1';
    const vName = currentVendor?.name || currentUser?.name || 'Supplier';

    if (onBid) {
      onBid(vId, vName, sku_code, qty, rate);
    } else if (onConfirmQuantity) {
      onConfirmQuantity(vId, vName, sku_code, qty);
    }

    setSelectedSku(null);
    setQuotedRate('');
    setQuotedQty('');
  };

  const handleBackoutSubmit = (e) => {
    e.preventDefault();
    if (!backoutSku) return;

    const vId = currentVendor?.id || currentUser?.vendorId || 'v1';
    const vName = currentVendor?.name || currentUser?.name || 'Supplier';

    onBackout(
      vId, 
      vName, 
      backoutSku.sku_code, 
      backoutReason || 'Stock shortage reported',
      backoutDropQty ? parseFloat(backoutDropQty) : null
    );
    setBackoutSku(null);
    setBackoutReason('');
    setBackoutDropQty('');
  };

  return (
    <div className={`space-y-4 ${compact ? 'max-w-md mx-auto' : 'max-w-2xl mx-auto'}`}>
      {/* 📲 PWA App Install Banner for Vendors */}
      {!isInstalled && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-slate-900 text-lg shadow-md shrink-0">
              P
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Install Pluckk Supplier App</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold uppercase">Mobile PWA</span>
              </h4>
              <p className="text-[11px] text-slate-700">
                Add to your phone home screen for live mandi updates & buzz alerts.
              </p>
            </div>
          </div>

          {installPrompt ? (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0 active:scale-95 flex items-center gap-1.5"
            >
              <Smartphone size={14} />
              <span>Install App</span>
            </button>
          ) : (
            <button
              onClick={() => alert("📱 To install on your phone:\n\n• Android (Chrome): Tap the 3 dots (⋮) in Chrome -> 'Install app' or 'Add to Home screen'.\n\n• iPhone (Safari): Tap the Share button (⎋) at the bottom -> 'Add to Home Screen' (➕).")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-700 text-slate-800 rounded-xl text-[11px] font-semibold transition shrink-0 border border-slate-200"
            >
              <span>Install Guide 📲</span>
            </button>
          )}
        </div>
      )}

      {/* Device Notifications Opt-In */}
      {notifPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
        <div className="bg-blue-50 border border-blue-500/30 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-300">
            <Bell size={14} className="text-blue-600 shrink-0" />
            <span className="text-[11px]">Turn on sound & vibration alerts for 12:30 AM indents & shortfall broadcasts</span>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition shrink-0"
          >
            Enable Alerts
          </button>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
              P
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Pluckk Supplier Portal</div>
              <div className="text-sm font-bold text-slate-900">Daily Mandi Procurement</div>
            </div>
          </div>

          {/* Top-Right "My Supply Catalogue" Button (Placed right where user requested!) */}
          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95"
            title="Manage what articles you supply to Pluckk"
          >
            <Package size={15} />
            <span>My Supply Catalogue</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
              {mySuppliedSkus.length}
            </span>
          </button>
        </div>

        {/* Vendor Selector Pill or Fixed Supplier View */}
        <div className="pt-2 border-t border-slate-200">
          {isRestricted ? (
            <div className="flex items-center justify-between text-xs bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Verified Supplier:</span>
                <span className="font-bold text-slate-900 text-sm">{currentUser?.name || currentVendor?.name || 'Verified Supplier'}</span>
                <span className="text-[11px] text-slate-500 block font-mono">{currentUser?.email || currentVendor?.email || ''}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg font-semibold block">
                  1-to-1 Verified
                </span>
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5 justify-end mt-1">
                  <Star size={10} className="fill-amber-400 text-amber-600" />
                  <span>★{currentVendor?.compositeRating || 4.8} Score</span>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Acting as Supplier (Switch to test):</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(vendors || []).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelectVendor(v.id)}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-xs transition border flex items-center justify-between ${
                      v.id === currentVendor?.id
                        ? 'bg-emerald-600 text-white font-semibold border-emerald-500 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate">{v.name.split(' ')[0]} {v.name.split(' ')[1] || ''}</span>
                    <span className="text-[10px] opacity-75">★{v.compositeRating || 4.8}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ⏰ 5:00 AM Bidding Window Status Banner */}
      <div className={`rounded-3xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
        isWindowOpen 
          ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/40 text-emerald-300' 
          : 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/40 text-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
            isWindowOpen ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-600 border border-amber-500/30'
          }`}>
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {isWindowOpen ? '🟢 Bidding Window Open (12:30 AM – 5:00 AM)' : '🔒 Bidding Window Closed (Locked at 5:00 AM)'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isWindowOpen ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {isWindowOpen ? 'Adjust Rates Anytime' : 'Allocations Finalized'}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 mt-0.5">
              {isWindowOpen 
                ? 'The system waits until 5:00 AM to accept bids. You can freely adjust your rate and quantity anytime before 5:00 AM!'
                : 'As clock hit 5:00 AM, the system approved lowest-price bids (L1). Quoted prices are now locked.'}
            </p>
          </div>
        </div>

        {isWindowOpen && (
          <div className="text-right shrink-0 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Allocation Time</span>
            <span className="text-xs font-mono font-bold text-emerald-600">05:00 AM IST</span>
          </div>
        )}
      </div>

      {/* 1-to-1 Privacy & L1 Lowest Price Rule Note */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-2 text-emerald-600 font-semibold">
          <ShieldCheck size={16} className="shrink-0" />
          <span>1-to-1 Least-Cost Allocation Engine</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Requirements are segregated based on your supply catalogue. Quote your best competitive rate — the system automatically awards orders to the <strong>minimum price (L1)</strong> at 5:00 AM, with vendor ratings (Quality, Price, Fill Rate, Time of Delivery) used as tie-breakers.
        </p>
      </div>

      {/* My Confirmed Allocations Section (Only after 5:00 AM window lock) */}
      {!isWindowOpen && myCommitments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Your Approved Commitments ({myCommitments.length})
              </h3>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Accepted at 5:00 AM</span>
          </div>

          <div className="space-y-2">
            {myCommitments.map((c) => (
              <div 
                key={c.sku_code} 
                className="bg-slate-100 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{c.item_name}</div>
                  <div className="text-xs text-emerald-600 font-bold mt-0.5">
                    {c.committed_qty} {c.unit} approved @ ₹{c.quoted_rate}/{c.unit}
                    {c.total_bid_qty > c.committed_qty && (
                      <span className="text-slate-500 font-normal ml-1">
                        (bid for {c.total_bid_qty} {c.unit})
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBackoutSku(c);
                    setBackoutDropQty(c.committed_qty.toString());
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 rounded-xl transition shrink-0"
                  title="Report stock shortfall or release your allocation"
                >
                  Report Shortfall / Release
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Open Indent Items (Filtered by this vendor's catalog) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Available Requirements (Matched to your Catalogue)
          </h3>
          <span className="text-xs text-slate-500">
            {visibleItems.length} articles matching your catalogue
          </span>
        </div>

        {visibleItems.map((item) => {
          const isFulfilled = item.remaining_qty === 0;
          const myBid = (item.bids || []).find(b => b && b.vendor_id === currentVendor?.id && b.status === 'ACTIVE');
          const isSelected = selectedSku === item.sku_code;

          return (
            <div 
              key={item.sku_code}
              className={`rounded-3xl border p-4 transition-all duration-200 ${
                isFulfilled 
                  ? 'bg-slate-50 border-slate-100 opacity-75' 
                  : item.status === 'PARTIALLY_FULFILLED'
                  ? 'bg-white border-amber-500/30 shadow-sm'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-base">{item.item_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Pluckk Target: <strong className="text-emerald-600 font-semibold">₹{item.target_rate}/{item.unit}</strong> • Target Qty: {item.required_qty} {item.unit}
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  {isFulfilled ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      <Lock size={12} /> Closed
                    </span>
                  ) : item.status === 'PARTIALLY_FULFILLED' ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      {item.remaining_qty} {item.unit} Left
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {item.remaining_qty} {item.unit} Open
                    </span>
                  )}
                </div>
              </div>

              {/* My quote status pill: handles Window OPEN vs LOCKED */}
              {myBid && (
                isWindowOpen ? (
                  <div className="mt-2.5 text-xs rounded-2xl p-3 flex items-center justify-between border bg-blue-50 border-blue-500/40 text-blue-200 shadow-xs">
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-white">
                        <span className="text-blue-600">📝 Your Submitted Quote:</span>
                        <span className="text-emerald-600 font-bold font-mono">
                          {myBid.quantity} {item.unit} @ ₹{myBid.quoted_rate}/{item.unit}
                        </span>
                      </div>
                      <span className="block text-[11px] text-slate-700 mt-0.5">
                        ⏳ Pending 5:00 AM allocation. You can adjust your price anytime before 5:00 AM!
                      </span>
                    </div>

                    <button
                      onClick={() => handleStartQuote(item)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 ml-2 shrink-0 flex items-center gap-1"
                    >
                      <span>✏️ Adjust Price</span>
                    </button>
                  </div>
                ) : (
                  <div className={`mt-2.5 text-xs rounded-2xl p-3 flex items-center justify-between border ${
                    myBid.allocated_qty > 0
                      ? 'bg-emerald-50 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-50 border-amber-500/40 text-amber-200'
                  }`}>
                    <div>
                      <span className="font-bold text-sm">
                        {myBid.allocated_qty > 0 
                          ? `🟢 Approved at 5:00 AM: ${myBid.allocated_qty} ${item.unit} @ ₹${myBid.quoted_rate}/${item.unit}` 
                          : `🔴 Not Awarded at 5:00 AM: Quoted ₹${myBid.quoted_rate}/${item.unit}`}
                      </span>
                      <span className="block text-[11px] opacity-80 mt-0.5">
                        {myBid.allocated_qty > 0 
                          ? `Accepted by system under Lowest Price (L1) allocation.` 
                          : `Another supplier offered a lower rate or higher vendor rating.`}
                      </span>
                    </div>

                    {myBid.allocated_qty > 0 && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold">
                        L1 Winner
                      </span>
                    )}
                  </div>
                )
              )}

              {/* Bidding / Action Area */}
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                {isWindowOpen ? (
                  isSelected ? (
                    <div className="space-y-3 bg-slate-100 p-3.5 rounded-2xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>{myBid ? `✏️ Adjust Quote for ${item.item_name}` : `Submit Quote for ${item.item_name}`}</span>
                        <span className="text-slate-500 text-[11px]">Pluckk Target: ₹{item.target_rate}/{item.unit}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-slate-700 block mb-1">
                            Your Price per {item.unit} (₹):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            placeholder="e.g. 25.00"
                            value={quotedRate}
                            onChange={(e) => setQuotedRate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-700 block mb-1">
                            Quantity you can give ({item.unit}):
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder={`e.g. ${item.remaining_qty || 50}`}
                            value={quotedQty}
                            onChange={(e) => setQuotedQty(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">
                          ⏱️ You can adjust again before 5:00 AM
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSku(null)}
                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleBidSubmit(item.sku_code)}
                            disabled={!quotedRate || !quotedQty || parseFloat(quotedRate) <= 0 || parseFloat(quotedQty) <= 0}
                            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
                          >
                            {myBid ? 'Save Adjusted Price' : 'Submit Quote'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleStartQuote(item)}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition shadow-sm active:scale-98 flex items-center justify-center gap-1.5 ${
                          myBid 
                            ? 'bg-slate-100 hover:bg-slate-700 text-emerald-600 border border-slate-200' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Check size={14} />
                        <span>{myBid ? '✏️ Adjust Price / Quantity' : '📝 Quote Price & Quantity (Open till 5 AM)'}</span>
                      </button>
                    </div>
                  )
                ) : (
                  // Bidding window closed: check if Round 2 FFF is ACTIVE for this SKU
                  item.round2_fff?.status === 'ACTIVE' && item.remaining_qty > 0 ? (
                    (() => {
                      const myFffApp = (item.round2_fff?.applications || []).find(
                        a => a.vendor_id === currentVendor?.id || a.vendor_name === currentVendor?.name
                      );

                      if (myFffApp) {
                        return (
                          <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                            myFffApp.status === 'ACCEPTED'
                              ? 'bg-emerald-50 border-emerald-500/40 text-emerald-200'
                              : myFffApp.status === 'REJECTED'
                              ? 'bg-red-50 border-red-500/40 text-red-200'
                              : 'bg-amber-50 border-amber-500/40 text-amber-200'
                          }`}>
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                <Zap size={14} className="text-amber-600" />
                                <span>Round 2 FFF Application Submitted</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                                myFffApp.status === 'ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : myFffApp.status === 'REJECTED'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-amber-500/20 text-amber-300 animate-pulse'
                              }`}>
                                {myFffApp.status === 'ACCEPTED' ? '✅ Approved & Allocated' : myFffApp.status === 'REJECTED' ? '❌ Rejected' : '⏳ Sourcing Reviewing (In Queue)'}
                              </span>
                            </div>

                            <div className="text-slate-700 text-xs">
                              Offered: <strong className="text-white">{myFffApp.quantity} {item.unit}</strong> @ <strong className="text-emerald-600 font-mono">₹{myFffApp.quoted_rate}/{item.unit}</strong>
                              <span className="text-slate-500 ml-2 font-mono text-[11px]">Logged at: {myFffApp.received_time || 'Just now'}</span>
                            </div>

                            {myFffApp.status === 'PENDING_APPROVAL' && (
                              <p className="text-[11px] text-amber-300/90 leading-tight">
                                ⚡ You are in the fastest finger queue! Sourcing and Admin have Accept & Reject buttons on their console and are reviewing applications in real-time.
                              </p>
                            )}

                            {myFffApp.status === 'ACCEPTED' && (
                              <p className="text-[11px] text-emerald-300/90 font-medium">
                                🎉 Your application was accepted! {myFffApp.allocated_qty || myFffApp.quantity} {item.unit} commitment is confirmed.
                              </p>
                            )}

                            {myFffApp.status === 'REJECTED' && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[11px] text-red-300">Demand still open ({item.remaining_qty} {item.unit}). You may re-apply:</span>
                                <button
                                  onClick={() => {
                                    setFffApplyingSku(item.sku_code);
                                    setFffQty(item.remaining_qty.toString());
                                    setFffRate((item.target_rate || 25).toString());
                                  }}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold"
                                >
                                  Re-Apply Now
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Vendor hasn't applied yet: Show application form
                      const isApplying = fffApplyingSku === item.sku_code;

                      return (
                        <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/50 p-3.5 rounded-2xl space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                              <Zap size={14} className="text-amber-600 animate-bounce" />
                              <span>⚡ ROUND 2: FASTEST FINGER FIRST (LIVE)</span>
                            </div>
                            <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                              {item.remaining_qty} {item.unit} Shortfall Needed
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-700 leading-snug">
                            Sourcing reopened this item for emergency shortfall fulfillment. The <strong>first vendor to apply</strong> is reviewed immediately by Sourcing Ops!
                          </p>

                          {isApplying ? (
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">
                                    Offered Qty ({item.unit}):
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.remaining_qty}
                                    value={fffQty}
                                    onChange={(e) => setFffQty(e.target.value)}
                                    placeholder={item.remaining_qty.toString()}
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 shadow-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">
                                    Quoted Price (₹/{item.unit}):
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    value={fffRate}
                                    onChange={(e) => setFffRate(e.target.value)}
                                    placeholder={item.target_rate?.toString() || '25'}
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 shadow-xs"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setFffApplyingSku(null)}
                                  className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleFffSubmit(item.sku_code)}
                                  disabled={!fffQty || !fffRate || parseFloat(fffQty) <= 0 || parseFloat(fffRate) <= 0}
                                  className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-lg text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Zap size={12} />
                                  <span>Submit Fastest Application ⚡</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setFffApplyingSku(item.sku_code);
                                setFffQty(item.remaining_qty.toString());
                                setFffRate((item.target_rate || 25).toString());
                              }}
                              className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Zap size={14} />
                              <span>Apply for Shortfall ({item.remaining_qty} {item.unit} Needed)</span>
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      <Lock size={13} className="text-slate-500" />
                      <span>Bidding window closed at 5:00 AM. Prices are locked.</span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State: If vendor has no items in their catalog */}
        {visibleItems.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
            <Package size={36} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-bold text-slate-900">No Matching Articles in your Catalogue</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your screen is set up to only show articles you supply. You currently have <strong>{mySuppliedSkus.length}</strong> articles selected in your catalogue.
            </p>
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition"
            >
              Open My Supply Catalogue
            </button>
          </div>
        )}
      </div>

      {/* Modal: Vendor Supply Catalog */}
      <VendorCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        vendor={currentVendor}
        currentUser={currentUser}
        skuMaster={skuMaster}
        onSaveCatalog={onSaveCatalog}
      />

      {/* Modal: Report Shortfall / Stock Release */}
      {backoutSku && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-red-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-red-600 font-bold">
                <AlertTriangle size={20} />
                <span>Report Stock Shortfall / Release Demand</span>
              </div>
              <button onClick={() => setBackoutSku(null)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-700">
              Reporting a stock issue or release for <strong>{backoutSku.item_name}</strong>. The system will immediately notify Pluckk and reopen the demand to alternative suppliers.
            </p>

            <form onSubmit={handleBackoutSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  How many kg can you NOT supply? (Max {backoutSku.committed_qty} {backoutSku.unit}):
                </label>
                <input
                  type="number"
                  max={backoutSku.committed_qty}
                  min="1"
                  required
                  value={backoutDropQty}
                  onChange={(e) => setBackoutDropQty(e.target.value)}
                  className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Reason for shortfall / stock release:</label>
                <select
                  value={backoutReason}
                  onChange={(e) => setBackoutReason(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                >
                  <option value="Poor quality batch at APMC mandi">Poor quality batch at APMC mandi</option>
                  <option value="Mandi rate skyrocketed beyond budget">Mandi rate skyrocketed beyond budget</option>
                  <option value="Supplier vehicle breakdown / delayed">Supplier vehicle breakdown / delayed</option>
                  <option value="Insufficient volume received from farm">Insufficient volume received from farm</option>
                  <option value="Voluntary allocation release for other suppliers">Voluntary allocation release for other suppliers</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBackoutSku(null)}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-sm"
                >
                  Release Stock & Notify Pluckk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

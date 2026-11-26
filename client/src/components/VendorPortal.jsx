import React, { useState, useEffect } from 'react';
import { 
  Package, Check, CheckCircle2, AlertCircle, Lock, 
  Send, AlertTriangle, ChevronDown, User, ShieldCheck, 
  Clock, ArrowRight, CornerDownRight, X, TrendingDown, Star,
  Smartphone, Bell, Download, Zap, LogOut, BookOpen, Layers,
  ChevronRight, Calendar, DollarSign, Truck, FileText, CheckCircle
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
  onApplyFFF,
  onLogout
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

  // Active Menu: 'live_bidding', 'my_orders', 'order_history', 'catalogue'
  const [activeVendorMenu, setActiveVendorMenu] = useState('live_bidding');
  const [isMobileMenuCollapsed, setIsMobileMenuCollapsed] = useState(false);

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

  // Sign out handler
  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      sessionStorage.removeItem('pluckk_user');
      sessionStorage.removeItem('pluckk_token');
      window.location.reload();
    }
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

  // Find all awarded commitments for this vendor (L1 winning bids accepted at 5:00 AM OR Round 2 FFF accepted)
  const myCommitments = (indent?.items || []).flatMap(item => {
    const myBid = (item.bids || []).find(b => b && b.vendor_id === currentVendor?.id && b.status === 'ACTIVE' && b.allocated_qty > 0);
    const myFffApp = (item.round2_fff?.applications || []).find(
      a => (a.vendor_id === currentVendor?.id || a.vendor_name === currentVendor?.name) && a.status === 'ACCEPTED'
    );
    
    const results = [];
    if (myBid) {
      results.push({
        sku_code: item.sku_code,
        item_name: item.item_name,
        category: item.category,
        unit: item.unit,
        target_rate: item.target_rate,
        quoted_rate: myBid.quoted_rate,
        committed_qty: myBid.allocated_qty,
        total_bid_qty: myBid.quantity,
        total_amount: myBid.allocated_qty * myBid.quoted_rate,
        timestamp: myBid.timestamp,
        awardType: 'L1 Lowest Price (5:00 AM IST)'
      });
    }
    if (myFffApp) {
      const qty = myFffApp.allocated_qty || myFffApp.quantity;
      results.push({
        sku_code: item.sku_code,
        item_name: item.item_name,
        category: item.category,
        unit: item.unit,
        target_rate: item.target_rate,
        quoted_rate: myFffApp.quoted_rate,
        committed_qty: qty,
        total_bid_qty: myFffApp.quantity,
        total_amount: qty * myFffApp.quoted_rate,
        timestamp: myFffApp.received_time,
        awardType: 'Round 2 Fastest Finger First'
      });
    }
    return results;
  });

  const totalPoAmount = myCommitments.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const totalCommittedKg = myCommitments.reduce((sum, c) => sum + (c.committed_qty || 0), 0);

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

  // Mocked historical fulfillments for Pluckk daily mandi cycles
  const pastOrdersHistory = [
    {
      id: 'PO-20261125-PLK01',
      date: '25 Nov 2026',
      hub: 'Turbhe APMC Hub (Inbound Gate 2)',
      items: [
        { name: 'Potato Agra Fresh (ज्योति आलू)', qty: 150, unit: 'kg', rate: 24, total: 3600 },
        { name: 'Onion Nashik Red (नाशिक लाल कांदा)', qty: 80, unit: 'kg', rate: 29, total: 2320 }
      ],
      totalAmount: 5920,
      totalKg: 230,
      status: 'Fulfilled & Settled',
      utr: 'PLK20261125-981240',
      rating: 4.9
    },
    {
      id: 'PO-20261124-PLK02',
      date: '24 Nov 2026',
      hub: 'Turbhe APMC Hub (Inbound Gate 2)',
      items: [
        { name: 'Tomato Hybrid (टमाटर)', qty: 120, unit: 'kg', rate: 22, total: 2640 },
        { name: 'Robusta Banana Semi-Ripe (केला)', qty: 90, unit: 'kg', rate: 27, total: 2430 }
      ],
      totalAmount: 5070,
      totalKg: 210,
      status: 'Fulfilled & Settled',
      utr: 'PLK20261124-774198',
      rating: 4.8
    },
    {
      id: 'PO-20261123-PLK03',
      date: '23 Nov 2026',
      hub: 'Turbhe APMC Hub (Inbound Gate 2)',
      items: [
        { name: 'Potato Agra Fresh (ज्योति आलू)', qty: 200, unit: 'kg', rate: 23.5, total: 4700 },
        { name: 'Cauliflower Grade A (फूलगोभी)', qty: 60, unit: 'kg', rate: 32, total: 1920 }
      ],
      totalAmount: 6620,
      totalKg: 260,
      status: 'Fulfilled & Settled',
      utr: 'PLK20261123-553210',
      rating: 4.9
    }
  ];

  // --------------------------------------------------------------------------
  // Left Sidebar Menu Component (Reusable for Desktop & Mobile Drawer)
  // --------------------------------------------------------------------------
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between space-y-6">
      <div className="space-y-5">
        {/* Vendor Header Card */}
        <div className="space-y-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-emerald-600/20 shrink-0">
              P
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Pluckk Supplier</div>
              <h3 className="font-extrabold text-slate-900 text-sm truncate" title={currentVendor?.name}>
                {currentVendor?.name || 'Verified Supplier'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono truncate" title={currentVendor?.email}>
                {currentVendor?.email || 'vendor@pluckk.partner'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-emerald-700 bg-emerald-100/70 font-bold px-2 py-0.5 rounded-md">
              1-to-1 Verified
            </span>
            <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <Star size={12} className="fill-amber-400 text-amber-500" />
              <span>★{currentVendor?.compositeRating || 4.8} Score</span>
            </span>
          </div>

          {/* Switch supplier tester (if not restricted) */}
          {!isRestricted && (
            <div className="pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Simulate Supplier:
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(vendors || []).slice(0, 4).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelectVendor(v.id)}
                    className={`text-left px-2 py-1 rounded-lg text-[11px] transition border truncate ${
                      v.id === currentVendor?.id
                        ? 'bg-emerald-600 text-white font-bold border-emerald-500'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu Options */}
        <nav className="space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Supplier Menu
          </div>

          {/* 1. Live Bidding */}
          <button
            onClick={() => setActiveVendorMenu('live_bidding')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeVendorMenu === 'live_bidding'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Zap size={16} className={activeVendorMenu === 'live_bidding' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Live Bidding</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeVendorMenu === 'live_bidding'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {visibleItems.length}
            </span>
          </button>

          {/* 2. My Orders (Allocated Orders) */}
          <button
            onClick={() => setActiveVendorMenu('my_orders')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeVendorMenu === 'my_orders'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package size={16} className={activeVendorMenu === 'my_orders' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>My Orders</span>
            </div>
            {myCommitments.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                {myCommitments.length}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-normal">0</span>
            )}
          </button>

          {/* 3. Order History */}
          <button
            onClick={() => setActiveVendorMenu('order_history')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeVendorMenu === 'order_history'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className={activeVendorMenu === 'order_history' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Order History</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {pastOrdersHistory.length}
            </span>
          </button>

          {/* 4. His Catalogue */}
          <button
            onClick={() => setActiveVendorMenu('catalogue')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeVendorMenu === 'catalogue'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen size={16} className={activeVendorMenu === 'catalogue' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>His Catalogue</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
              {mySuppliedSkus.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom Pinned Section: Sign Out */}
      <div className="pt-4 border-t border-slate-200 space-y-2 mt-auto">
        <button
          onClick={() => setIsCatalogModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          title="Configure which articles you supply"
        >
          <Layers size={13} className="text-emerald-600" />
          <span>Edit Supply Catalogue</span>
        </button>

        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs transition border border-transparent hover:border-red-200 active:scale-98"
          title="Sign out of your supplier account"
        >
          <LogOut size={16} className="text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // View 1: Live Bidding (Current Indent, 12:30 AM–5:00 AM Quotes & FFF Shortfalls)
  // --------------------------------------------------------------------------
  const renderLiveBiddingView = () => (
    <div className="space-y-4">
      {/* ⏰ 5:00 AM Bidding Window Status Banner */}
      <div className={`rounded-3xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
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
            <p className="text-[11px] text-slate-300 mt-0.5">
              {isWindowOpen 
                ? 'The system waits until 5:00 AM to accept bids. You can freely adjust your rate and quantity anytime before 5:00 AM!'
                : 'As clock hit 5:00 AM, the system approved lowest-price bids (L1). Check the "My Orders" tab on the left for awarded orders.'}
            </p>
          </div>
        </div>

        {isWindowOpen && (
          <div className="text-right shrink-0 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Allocation Time</span>
            <span className="text-xs font-mono font-bold text-emerald-400">05:00 AM IST</span>
          </div>
        )}
      </div>

      {/* 1-to-1 Privacy & L1 Rule Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
          <span>1-to-1 Least-Cost Allocation Engine</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600">
          Requirements are segregated based on your supply catalogue. Quote your best competitive rate — the system automatically awards orders to the <strong>minimum price (L1)</strong> at 5:00 AM, with vendor ratings used as tie-breakers.
        </p>
      </div>

      {/* Live Open Indent Items (Filtered by this vendor's catalog) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                  ? 'bg-slate-50 border-slate-200 opacity-80' 
                  : item.status === 'PARTIALLY_FULFILLED'
                  ? 'bg-white border-amber-300 shadow-xs'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{item.item_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Pluckk Target: <strong className="text-emerald-700 font-bold">₹{item.target_rate}/{item.unit}</strong> • Target Qty: {item.required_qty} {item.unit}
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  {isFulfilled ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      <Lock size={12} /> Closed
                    </span>
                  ) : item.status === 'PARTIALLY_FULFILLED' ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      {item.remaining_qty} {item.unit} Left
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {item.remaining_qty} {item.unit} Open
                    </span>
                  )}
                </div>
              </div>

              {/* My quote status pill: handles Window OPEN vs LOCKED */}
              {myBid && (
                isWindowOpen ? (
                  <div className="mt-2.5 text-xs rounded-2xl p-3 flex items-center justify-between border bg-blue-50 border-blue-200 text-blue-900 shadow-xs">
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-slate-900">
                        <span className="text-blue-700">📝 Your Submitted Quote:</span>
                        <span className="text-emerald-700 font-bold font-mono">
                          {myBid.quantity} {item.unit} @ ₹{myBid.quoted_rate}/{item.unit}
                        </span>
                      </div>
                      <span className="block text-[11px] text-slate-600 mt-0.5">
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
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <div>
                      <span className="font-bold text-sm">
                        {myBid.allocated_qty > 0 
                          ? `🟢 Approved at 5:00 AM: ${myBid.allocated_qty} ${item.unit} @ ₹{myBid.quoted_rate}/${item.unit}` 
                          : `🔴 Not Awarded at 5:00 AM: Quoted ₹${myBid.quoted_rate}/${item.unit}`}
                      </span>
                      <span className="block text-[11px] opacity-80 mt-0.5">
                        {myBid.allocated_qty > 0 
                          ? `Accepted by system under Lowest Price (L1) allocation.` 
                          : `Another supplier offered a lower rate or higher vendor rating.`}
                      </span>
                    </div>

                    {myBid.allocated_qty > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-lg font-bold">
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
                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>{myBid ? `✏️ Adjust Quote for ${item.item_name}` : `Submit Quote for ${item.item_name}`}</span>
                        <span className="text-slate-500 text-[11px]">Pluckk Target: ₹{item.target_rate}/{item.unit}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Your Price per {item.unit} (₹):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            placeholder="e.g. 25.00"
                            value={quotedRate}
                            onChange={(e) => setQuotedRate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                            style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a', backgroundColor: '#ffffff' }}
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Quantity you can give ({item.unit}):
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder={`e.g. ${item.remaining_qty || 50}`}
                            value={quotedQty}
                            onChange={(e) => setQuotedQty(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                            style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a', backgroundColor: '#ffffff' }}
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
                            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
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
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition shadow-xs active:scale-98 flex items-center justify-center gap-1.5 ${
                          myBid 
                            ? 'bg-slate-100 hover:bg-slate-200 text-emerald-800 border border-slate-200' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
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
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : myFffApp.status === 'REJECTED'
                              ? 'bg-red-50 border-red-300 text-red-900'
                              : 'bg-amber-50 border-amber-300 text-amber-900'
                          }`}>
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                <Zap size={14} className="text-amber-600" />
                                <span>Round 2 FFF Application Submitted</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                                myFffApp.status === 'ACCEPTED'
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : myFffApp.status === 'REJECTED'
                                  ? 'bg-red-200 text-red-900'
                                  : 'bg-amber-200 text-amber-900 animate-pulse'
                              }`}>
                                {myFffApp.status === 'ACCEPTED' ? '✅ Approved & Allocated' : myFffApp.status === 'REJECTED' ? '❌ Rejected' : '⏳ Sourcing Reviewing (In Queue)'}
                              </span>
                            </div>

                            <div className="text-slate-700 text-xs">
                              Offered: <strong className="text-slate-900">{myFffApp.quantity} {item.unit}</strong> @ <strong className="text-emerald-700 font-mono">₹{myFffApp.quoted_rate}/{item.unit}</strong>
                              <span className="text-slate-500 ml-2 font-mono text-[11px]">Logged at: {myFffApp.received_time || 'Just now'}</span>
                            </div>

                            {myFffApp.status === 'PENDING_APPROVAL' && (
                              <p className="text-[11px] text-amber-800 leading-tight">
                                ⚡ You are in the fastest finger queue! Sourcing and Admin have Accept & Reject buttons on their console and are reviewing applications in real-time.
                              </p>
                            )}

                            {myFffApp.status === 'ACCEPTED' && (
                              <p className="text-[11px] text-emerald-800 font-medium">
                                🎉 Your application was accepted! {myFffApp.allocated_qty || myFffApp.quantity} {item.unit} commitment is confirmed. Check "My Orders" tab on left.
                              </p>
                            )}

                            {myFffApp.status === 'REJECTED' && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[11px] text-red-700">Demand still open ({item.remaining_qty} {item.unit}). You may re-apply:</span>
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
                        <div className="bg-amber-50/80 border border-amber-300 p-3.5 rounded-2xl space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                              <Zap size={14} className="text-amber-600 animate-bounce" />
                              <span>⚡ ROUND 2: FASTEST FINGER FIRST (LIVE)</span>
                            </div>
                            <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                              {item.remaining_qty} {item.unit} Shortfall Needed
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-700 leading-snug">
                            Sourcing reopened this item for emergency shortfall fulfillment. The <strong>first vendor to apply</strong> is reviewed immediately by Sourcing Ops!
                          </p>

                          {isApplying ? (
                            <div className="bg-white border border-amber-200 p-3 rounded-xl space-y-2.5 shadow-xs">
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
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                                    style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a', backgroundColor: '#ffffff' }}
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
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                                    style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a', backgroundColor: '#ffffff' }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setFffApplyingSku(null)}
                                  className="px-2.5 py-1 text-[11px] text-slate-600 hover:text-slate-900"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleFffSubmit(item.sku_code)}
                                  disabled={!fffQty || !fffRate || parseFloat(fffQty) <= 0 || parseFloat(fffRate) <= 0}
                                  className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-lg text-xs shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
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
                              className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Zap size={14} />
                              <span>Apply for Shortfall ({item.remaining_qty} {item.unit} Needed)</span>
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
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
            <Package size={36} className="mx-auto text-slate-400" />
            <h4 className="text-sm font-bold text-slate-900">No Matching Articles in your Catalogue</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your screen is set up to only show articles you supply. You currently have <strong>{mySuppliedSkus.length}</strong> articles selected in your catalogue.
            </p>
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition"
            >
              Open My Supply Catalogue
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // View 2: My Orders ("allocated orders would appear here")
  // --------------------------------------------------------------------------
  const renderMyOrdersView = () => (
    <div className="space-y-4">
      {/* Header & PO Value Metrics Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-4 border border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Official Purchase Orders
              </span>
              <span className="text-xs text-slate-300">Daily Night Indent</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">My Allocated Orders & Commitments</h2>
            <p className="text-xs text-slate-300">
              Orders awarded to {currentVendor?.name || 'you'} locked at 5:00 AM via L1 least-cost allocation or Round 2 FFF.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
            <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">Total PO Value</span>
            <span className="text-xl font-black font-mono text-white">
              ₹{totalPoAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-300 block">Total Volume</span>
            <span className="font-black text-sm text-white">{totalCommittedKg} kg</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-300 block">Allocated Articles</span>
            <span className="font-black text-sm text-white">{myCommitments.length} items</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-300 block">Delivery DC Hub</span>
            <span className="font-bold text-xs text-emerald-300 truncate">Turbhe APMC Gate 2</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-300 block">Gate Arrival By</span>
            <span className="font-bold text-xs text-amber-300">08:30 AM IST (Today)</span>
          </div>
        </div>
      </div>

      {/* Allocated Orders List */}
      {myCommitments.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Confirmed Allocation Items ({myCommitments.length})</span>
            </h3>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Ready for DC Dispatch
            </span>
          </div>

          {myCommitments.map((order, idx) => (
            <div 
              key={order.sku_code || idx}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3 hover:border-emerald-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{order.item_name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                      {order.category || 'Produce'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      ✓ {order.awardType || 'Awarded Allocation'}
                    </span>
                    {order.timestamp && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Time: {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right bg-emerald-50/70 border border-emerald-200 px-3.5 py-1.5 rounded-2xl shrink-0">
                  <span className="text-[10px] text-slate-500 font-semibold block">Item PO Amount</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    ₹{order.total_amount?.toLocaleString('en-IN') || (order.committed_qty * order.quoted_rate).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Rate & Quantity Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">Approved Quantity:</span>
                  <span className="font-black text-slate-900 text-sm">{order.committed_qty} {order.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">Your Winning Rate:</span>
                  <span className="font-black text-emerald-700 text-sm font-mono">₹{order.quoted_rate}/{order.unit}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block font-medium">Pluckk Target:</span>
                  <span className="font-medium text-slate-600">₹{order.target_rate || order.quoted_rate}/{order.unit}</span>
                </div>
              </div>

              {/* Delivery Note & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Truck size={14} className="text-emerald-600 shrink-0" />
                  <span>Dispatch in food-grade crates to Turbhe APMC Inbound Gate.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setBackoutSku(order);
                      setBackoutDropQty(order.committed_qty.toString());
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl transition shadow-xs active:scale-95"
                    title="Report stock shortage or vehicle delay"
                  >
                    Report Shortfall / Release
                  </button>
                  <button
                    onClick={() => alert(`📄 Pluckk Delivery Slip Generated:\n\n• Item: ${order.item_name}\n• Allocated Qty: ${order.committed_qty} ${order.unit}\n• Rate: ₹${order.quoted_rate}/${order.unit}\n• Vendor: ${currentVendor?.name}\n• Destination: Turbhe APMC Central DC Gate 2\n• Arrival Time: By 08:30 AM IST`)}
                    className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition shadow-xs active:scale-95 flex items-center gap-1"
                  >
                    <Download size={13} />
                    <span>Challan</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State: If no orders are allocated yet */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100">
            <Package size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Allocated Orders In This Cycle Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {isWindowOpen ? (
                <>
                  The bidding window is currently <strong>OPEN</strong> (12:30 AM – 5:00 AM).
                  Pluckk evaluates all quotes and automatically allocates orders to the lowest price (L1) supplier at <strong>5:00 AM IST</strong>.
                </>
              ) : (
                <>
                  The 5:00 AM bidding cycle has locked. You do not have confirmed allocations for this cycle, or another supplier offered a lower price.
                </>
              )}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveVendorMenu('live_bidding')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-2"
            >
              <Zap size={14} />
              <span>Go to Live Bidding & Quote Rates</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // View 3: Order History (Past Mandi Fulfilled Indents & Settlement Logs)
  // --------------------------------------------------------------------------
  const renderOrderHistoryView = () => (
    <div className="space-y-4">
      {/* Historical Performance Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Procurement History & Settlements</h2>
            <p className="text-xs text-slate-500">
              Complete archive of past mandi indents fulfilled by {currentVendor?.name || 'your firm'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" />
              <span>100% On-Time Payouts</span>
            </span>
          </div>
        </div>

        {/* Lifetime Vendor Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Delivered Volume</span>
            <span className="font-black text-slate-900 text-base">14,850 kg</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Payouts</span>
            <span className="font-black text-emerald-700 text-base font-mono">₹4,18,500</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Fill Rate</span>
            <span className="font-black text-slate-900 text-base">99.4%</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Quality Score</span>
            <span className="font-black text-amber-700 text-base flex items-center gap-1">
              <Star size={14} className="fill-amber-400 text-amber-500" />
              <span>★4.8 / 5.0</span>
            </span>
          </div>
        </div>
      </div>

      {/* Past Indents Log */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 px-1">
          Recent Procurement Cycles
        </h3>

        {pastOrdersHistory.map((pastOrder) => (
          <div 
            key={pastOrder.id}
            className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-mono text-xs font-bold">
                  <Calendar size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{pastOrder.date}</span>
                    <span className="text-[10px] font-mono text-slate-500">{pastOrder.id}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{pastOrder.hub}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ✓ {pastOrder.status}
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  ₹{pastOrder.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Delivered Articles Breakdown */}
            <div className="space-y-1.5">
              {pastOrder.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{it.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">({it.qty} {it.unit} @ ₹{it.rate}/{it.unit})</span>
                  </div>
                  <span className="font-mono font-bold text-slate-700">₹{it.total}</span>
                </div>
              ))}
            </div>

            {/* Settlement Details Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="font-mono">Settlement Ref: {pastOrder.utr}</span>
              <button
                onClick={() => alert(`📄 Payment Voucher for ${pastOrder.id}:\n\nAmount: ₹${pastOrder.totalAmount}\nPaid to: ${currentVendor?.name}\nStatus: Settled via Direct NEFT\nUTR: ${pastOrder.utr}`)}
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <Download size={12} />
                <span>Download Invoice</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // View 4: His Catalogue (Manage and View Articles Supplied by Vendor)
  // --------------------------------------------------------------------------
  const renderCatalogueView = () => (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                1-to-1 Privacy Filter
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 mt-1">His Supply Catalogue</h2>
            <p className="text-xs text-slate-500">
              Articles mapped to <strong>{currentVendor?.name}</strong>. Only these items will appear on your live bidding screen.
            </p>
          </div>

          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Layers size={14} />
            <span>Edit My Supply Articles</span>
          </button>
        </div>

        {/* Active Articles Count Pill */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-medium">
          <span>Active Supplied Articles: <strong>{mySuppliedSkus.length} of {skuMaster.length || 10} master articles</strong></span>
          <span className="text-[11px] text-emerald-700">Prices segregated per supplier</span>
        </div>
      </div>

      {/* Grid of Supplied Articles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(skuMaster.length > 0 ? skuMaster : [
          { sku_code: 'PLK-VEG-POT-01', item_name: 'Potato Agra Fresh (ज्योति आलू)', category: 'Vegetables', unit: 'kg', benchmark_price: 26 },
          { sku_code: 'PLK-VEG-ONI-02', item_name: 'Onion Nashik Red (नाशिक लाल कांदा)', category: 'Vegetables', unit: 'kg', benchmark_price: 32 },
          { sku_code: 'PLK-VEG-TOM-03', item_name: 'Tomato Hybrid (टमाटर)', category: 'Vegetables', unit: 'kg', benchmark_price: 24 },
          { sku_code: 'PLK-FRU-BAN-01', item_name: 'Robusta Banana Semi-Ripe (केला)', category: 'Fruits', unit: 'kg', benchmark_price: 30 },
          { sku_code: 'PLK-FRU-POM-02', item_name: 'Pomegranate Bhagwa (अनार)', category: 'Fruits', unit: 'kg', benchmark_price: 140 }
        ]).map((sku) => {
          const isSupplied = mySuppliedSkus.includes(sku.sku_code);

          return (
            <div 
              key={sku.sku_code}
              className={`p-4 rounded-3xl border transition ${
                isSupplied 
                  ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/10' 
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{sku.item_name}</h4>
                  <span className="text-[10px] font-mono text-slate-500 block">{sku.sku_code} • {sku.category}</span>
                </div>
                {isSupplied ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <Check size={10} /> Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    Not Supplied
                  </span>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Pluckk Target:</span>
                <span className="font-bold font-mono text-slate-900">₹{sku.benchmark_price || 25}/{sku.unit || 'kg'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Main Render Layout
  // --------------------------------------------------------------------------
  if (compact) {
    // Compact Mode (For Split View Simulator - 2 side-by-side columns)
    return (
      <div className="space-y-3">
        {/* Compact Navigation Tabs Strip (2 Clean Rows, No Horizontal Scroll) */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveVendorMenu('live_bidding')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center truncate ${
              activeVendorMenu === 'live_bidding'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            ⚡ Bidding ({visibleItems.length})
          </button>
          <button
            onClick={() => setActiveVendorMenu('my_orders')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center truncate ${
              activeVendorMenu === 'my_orders'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            📦 Orders ({myCommitments.length})
          </button>
          <button
            onClick={() => setActiveVendorMenu('order_history')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center truncate ${
              activeVendorMenu === 'order_history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            📜 Order History
          </button>
          <button
            onClick={() => setActiveVendorMenu('catalogue')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center truncate ${
              activeVendorMenu === 'catalogue'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            🥬 Catalogue ({mySuppliedSkus.length})
          </button>
        </div>

        {/* Selected View */}
        {activeVendorMenu === 'live_bidding' && renderLiveBiddingView()}
        {activeVendorMenu === 'my_orders' && renderMyOrdersView()}
        {activeVendorMenu === 'order_history' && renderOrderHistoryView()}
        {activeVendorMenu === 'catalogue' && renderCatalogueView()}

        {/* Modal: Vendor Supply Catalog */}
        <VendorCatalogModal
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          vendor={currentVendor}
          currentUser={currentUser}
          skuMaster={skuMaster}
          onSaveCatalog={onSaveCatalog}
        />
      </div>
    );
  }

  // Full Vendor Portal Layout (Desktop Two-Column with Left Menu + Mobile Drawer)
  return (
    <div className="w-full">
      {/* 📲 PWA App Install Banner for Vendors */}
      {!isInstalled && (
        <div className="mb-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-3.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-slate-900 text-lg shadow-md shrink-0">
              P
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Install Pluckk Supplier App</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold uppercase">Mobile PWA</span>
              </h4>
              <p className="text-[11px] text-slate-300">
                Add to your phone home screen for live mandi updates & buzz alerts.
              </p>
            </div>
          </div>

          {installPrompt ? (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 active:scale-95 flex items-center gap-1.5"
            >
              <Smartphone size={14} />
              <span>Install App</span>
            </button>
          ) : (
            <button
              onClick={() => alert("📱 To install on your phone:\n\n• Android (Chrome): Tap the 3 dots (⋮) in Chrome -> 'Install app' or 'Add to Home screen'.\n\n• iPhone (Safari): Tap the Share button (⎋) at the bottom -> 'Add to Home Screen' (➕).")}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold transition shrink-0 border border-slate-700"
            >
              <span>Install Guide 📲</span>
            </button>
          )}
        </div>
      )}

      {/* Device Notifications Opt-In */}
      {notifPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-800">
            <Bell size={14} className="text-blue-600 shrink-0" />
            <span className="text-[11px]">Turn on sound & vibration alerts for 12:30 AM indents & shortfall broadcasts</span>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition shrink-0 shadow-xs"
          >
            Enable Alerts
          </button>
        </div>
      )}

      {/* Mobile Menu (Row-Wise Layout without Horizontal Scrolling) */}
      <div className="lg:hidden mb-4 bg-white border border-slate-200 rounded-3xl p-3 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Supplier Menu
          </span>
          <button
            onClick={() => setIsMobileMenuCollapsed(prev => !prev)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 active:scale-95 transition"
          >
            <span>{isMobileMenuCollapsed ? 'Expand All Rows ▼' : 'Compact View ▲'}</span>
          </button>
        </div>

        {isMobileMenuCollapsed ? (
          /* Single active row preview when collapsed */
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold">
              {activeVendorMenu === 'live_bidding' && <Zap size={16} />}
              {activeVendorMenu === 'my_orders' && <Package size={16} />}
              {activeVendorMenu === 'order_history' && <Clock size={16} />}
              {activeVendorMenu === 'catalogue' && <BookOpen size={16} />}
              <span>
                {activeVendorMenu === 'live_bidding' && `Live Bidding (${visibleItems.length})`}
                {activeVendorMenu === 'my_orders' && `My Orders (${myCommitments.length})`}
                {activeVendorMenu === 'order_history' && 'Order History'}
                {activeVendorMenu === 'catalogue' && `His Catalogue (${mySuppliedSkus.length})`}
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuCollapsed(false)}
              className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-xl font-bold transition"
            >
              Change Menu
            </button>
          </div>
        ) : (
          /* Full Row-Wise List */
          <div className="space-y-1.5">
            {/* Row 1: Live Bidding */}
            <button
              onClick={() => setActiveVendorMenu('live_bidding')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeVendorMenu === 'live_bidding'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap size={15} />
                <span>Live Bidding</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeVendorMenu === 'live_bidding' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {visibleItems.length} Open
              </span>
            </button>

            {/* Row 2: My Orders (Allocated) */}
            <button
              onClick={() => setActiveVendorMenu('my_orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeVendorMenu === 'my_orders'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package size={15} />
                <span>My Orders (Allocated)</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeVendorMenu === 'my_orders' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {myCommitments.length} Confirmed
              </span>
            </button>

            {/* Row 3: Order History */}
            <button
              onClick={() => setActiveVendorMenu('order_history')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeVendorMenu === 'order_history'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock size={15} />
                <span>Order History</span>
              </div>
              <span className={`text-[10px] font-semibold ${
                activeVendorMenu === 'order_history' ? 'text-emerald-100' : 'text-slate-500'
              }`}>
                Past Indents & Bills
              </span>
            </button>

            {/* Row 4: His Catalogue */}
            <button
              onClick={() => setActiveVendorMenu('catalogue')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeVendorMenu === 'catalogue'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen size={15} />
                <span>His Catalogue</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeVendorMenu === 'catalogue' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {mySuppliedSkus.length} Articles
              </span>
            </button>

            {/* Row 5: Sign Out */}
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-bold text-red-600 bg-red-50/60 hover:bg-red-100 border border-red-100 transition mt-1"
            >
              <div className="flex items-center gap-2.5">
                <LogOut size={15} />
                <span>Sign Out</span>
              </div>
              <span className="text-[10px] text-red-400 font-normal">Log out of supplier portal</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Menu (Fixed on Desktop) */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs sticky top-20 min-h-[580px]">
          {renderSidebarContent()}
        </aside>

        {/* Right Main Content Panel */}
        <main className="flex-1 min-w-0 w-full">
          {activeVendorMenu === 'live_bidding' && renderLiveBiddingView()}
          {activeVendorMenu === 'my_orders' && renderMyOrdersView()}
          {activeVendorMenu === 'order_history' && renderOrderHistoryView()}
          {activeVendorMenu === 'catalogue' && renderCatalogueView()}
        </main>
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
          <div className="bg-white border border-red-200 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-red-600 font-bold">
                <AlertTriangle size={20} />
                <span>Report Stock Shortfall / Release Demand</span>
              </div>
              <button onClick={() => setBackoutSku(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Reporting a stock issue or release for <strong>{backoutSku.item_name}</strong>. The system will immediately notify Pluckk and reopen the demand to alternative suppliers.
            </p>

            <form onSubmit={handleBackoutSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
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
                  style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a', backgroundColor: '#ffffff' }}
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Reason for shortfall / stock release:</label>
                <select
                  value={backoutReason}
                  onChange={(e) => setBackoutReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
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
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-xs"
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

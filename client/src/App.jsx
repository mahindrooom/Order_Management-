import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AdminDashboard from './components/AdminDashboard';
import VendorPortal from './components/VendorPortal';
import SplitViewSimulator from './components/SplitViewSimulator';
import NotificationFeed from './components/NotificationFeed';
import UploadModal from './components/UploadModal';
import LoginPage from './components/LoginPage';
import { 
  Building2, Smartphone, SplitSquareVertical, Bell, 
  Wifi, WifiOff, AlertTriangle, CheckCircle2, ShieldAlert,
  Layers, RefreshCw, LogOut, ShieldCheck, User, Award, ShoppingCart
} from 'lucide-react';

const SOCKET_URL = undefined;

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pluckk_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator', 'admin', 'vendor'
  const [currentVendorId, setCurrentVendorId] = useState('v1');
  
  const [indent, setIndent] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [skuMaster, setSkuMaster] = useState([]);
  const [summary, setSummary] = useState({
    total_skus: 0,
    total_demand_kg: 0,
    total_allocated_kg: 0,
    total_remaining_kg: 0,
    fill_rate_pct: 0,
    fulfilled_skus: 0
  });
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isSourcing = currentUser?.role === 'SOURCING' || isAdmin;
  const isVendor = currentUser?.role === 'VENDOR';

  // Load SKU Master
  const fetchSkuMaster = async () => {
    try {
      const res = await fetch('/api/sku-master');
      const data = await res.json();
      setSkuMaster(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSkuMaster();
  }, []);

  // Lock active tab based on role
  useEffect(() => {
    if (currentUser) {
      if (isVendor) {
        setActiveTab('vendor');
        if (currentUser.vendorId) {
          setCurrentVendorId(currentUser.vendorId);
        }
      } else {
        setActiveTab(isAdmin ? 'simulator' : 'admin');
      }
    }
  }, [currentUser]);

  // Initialize Socket.io
  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('get:state');
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('state:init', (data) => {
      setIndent(data.indent);
      setVendors(data.vendors || []);
      setSummary(data.summary);
      setLogs(data.logs || []);
    });

    s.on('state:updated', (data) => {
      setIndent(data.indent);
      setSummary(data.summary);
      if (data.log) {
        setLogs(prev => [...prev.slice(-49), data.log]);
        showToast(data.log.title, data.log.severity);
      }
    });

    s.on('sku:updated', (data) => {
      setIndent(prev => {
        if (!prev) return prev;
        const newItems = prev.items.map(item => 
          item.sku_code === data.sku.sku_code ? data.sku : item
        );
        return { ...prev, items: newItems };
      });
      setSummary(data.summary);
      if (data.log) {
        setLogs(prev => [...prev.slice(-49), data.log]);
        showToast(data.log.title, data.log.severity);
      }
    });

    s.on('vendor:catalog_updated', (data) => {
      setVendors(prev => prev.map(v => 
        v.id === data.vendor_id ? { ...v, supplied_skus: data.supplied_skus } : v
      ));
      showToast(`${data.vendor_name}'s catalogue updated (${data.supplied_skus.length} articles)`, 'info');
    });

    s.on('notification:sos', (data) => {
      if (data.log) {
        setLogs(prev => [...prev.slice(-49), data.log]);
        showToast(data.log.title, 'warning');
      }
    });

    s.on('error:response', (data) => {
      showToast(data.message, 'critical');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const showToast = (message, severity = 'info') => {
    setToast({ message, severity, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleLogout = () => {
    localStorage.removeItem('pluckk_user');
    localStorage.removeItem('pluckk_token');
    setCurrentUser(null);
  };

  // Vendor Action: Submit Bid (Rate + Qty)
  const handleBid = (vendor_id, vendor_name, sku_code, quantity, quoted_rate) => {
    if (!socket) return;
    socket.emit('vendor:submit_bid', {
      vendor_id,
      vendor_name,
      sku_code,
      quantity,
      quoted_rate
    });
  };

  // Vendor Action: Back out / Shortfall report
  const handleBackout = (vendor_id, vendor_name, sku_code, reason, drop_qty) => {
    if (!socket) return;
    socket.emit('vendor:backout', {
      vendor_id,
      vendor_name,
      sku_code,
      reason,
      drop_qty
    });
  };

  // Save Vendor Supply Catalog
  const handleSaveCatalog = async (vendor_id, supplied_skus) => {
    try {
      const res = await fetch(`/api/vendors/${vendor_id}/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplied_skus })
      });
      const data = await res.json();
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendor_id ? data.vendor : v));
        showToast('Supply catalogue saved successfully!', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Vendor 4-Pillar Ratings (Admin only)
  const handleUpdateVendorRatings = async (vendor_id, ratings) => {
    try {
      const res = await fetch(`/api/vendors/${vendor_id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratings)
      });
      const data = await res.json();
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === vendor_id ? data.vendor : v));
        showToast('Vendor 4-pillar ratings updated!', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin/Sourcing Action: Emergency SOS Broadcast
  const handleBroadcastSOS = (sku_code) => {
    if (!socket) return;
    socket.emit('admin:broadcast_sos', { sku_code });
  };

  // Admin Action: Reset
  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Simulation Helper
  const handleSimulate5AMBackout = () => {
    if (!indent || !indent.items) return;
    const itemWithBid = indent.items.find(i => 
      (i.bids || []).some(b => b.status === 'ACTIVE' && b.allocated_qty > 0)
    );

    if (itemWithBid) {
      const winningBid = itemWithBid.bids.find(b => b.status === 'ACTIVE' && b.allocated_qty > 0);
      handleBackout(
        winningBid.vendor_id,
        winningBid.vendor_name,
        itemWithBid.sku_code,
        'Damaged batch / stock shortage reported, releasing allocation',
        winningBid.allocated_qty
      );
    } else {
      showToast('First submit a quote on an item (e.g. ₹27 for 50kg Potato) to simulate a shortfall release!', 'warning');
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-emerald-500/20 shrink-0">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">Pluckk</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isAdmin 
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' 
                    : isSourcing
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {isAdmin ? '👑 EXECUTIVE ADMIN' : isSourcing ? '🛒 SOURCING OPS' : '🚚 SUPPLIER PORTAL (1-to-1)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Night Indent (12:30 AM) & Lowest-Price (L1) Engine</p>
            </div>
          </div>

          {/* View Mode Switcher Tabs (Only visible to Admin & Sourcing) */}
          {isSourcing ? (
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 text-xs font-semibold">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('simulator')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                    activeTab === 'simulator'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SplitSquareVertical size={14} />
                  <span className="hidden sm:inline">Split Simulator</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 size={14} />
                <span>{isAdmin ? 'Admin Console' : 'Sourcing Console'}</span>
              </button>

              <button
                onClick={() => setActiveTab('vendor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activeTab === 'vendor'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone size={14} />
                <span>Vendor Mobile View</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-500/30 px-3 py-1 rounded-xl text-xs text-blue-300">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="font-semibold">1-to-1 Supplier Mode</span>
            </div>
          )}

          {/* Right Action Section: User Info & Logout */}
          <div className="flex items-center gap-3">
            {connected ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Sync</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-red-400 font-medium bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                <WifiOff size={12} />
                <span>Offline</span>
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-white truncate max-w-[150px]">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{currentUser.email}</div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isSourcing && activeTab === 'simulator' && (
          <SplitViewSimulator
            indent={indent}
            summary={summary}
            vendors={vendors}
            logs={logs}
            onBid={handleBid}
            onBackout={handleBackout}
            onBroadcastSOS={handleBroadcastSOS}
            onReset={handleReset}
            onOpenUpload={() => setIsUploadOpen(true)}
            onSimulate5AMBackout={handleSimulate5AMBackout}
            currentUser={currentUser}
            skuMaster={skuMaster}
            onSaveCatalog={handleSaveCatalog}
            onUpdateVendorRatings={handleUpdateVendorRatings}
          />
        )}

        {isSourcing && activeTab === 'admin' && (
          <div className="space-y-6">
            <AdminDashboard
              indent={indent}
              summary={summary}
              vendors={vendors}
              logs={logs}
              onBroadcastSOS={handleBroadcastSOS}
              onReset={handleReset}
              onOpenUpload={() => setIsUploadOpen(true)}
              onSimulate5AMBackout={handleSimulate5AMBackout}
              currentUser={currentUser}
              skuMaster={skuMaster}
              onSaveCatalog={handleSaveCatalog}
              onUpdateVendorRatings={handleUpdateVendorRatings}
            />
            <NotificationFeed logs={logs} />
          </div>
        )}

        {(!isSourcing || activeTab === 'vendor') && (
          <div className="py-2">
            <VendorPortal
              vendors={vendors}
              currentVendorId={currentVendorId}
              onSelectVendor={setCurrentVendorId}
              indent={indent}
              onBid={handleBid}
              onBackout={handleBackout}
              isRestricted={isVendor}
              currentUser={currentUser}
              skuMaster={skuMaster}
              onSaveCatalog={handleSaveCatalog}
            />
          </div>
        )}
      </main>

      {/* Floating Real-Time Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`p-4 rounded-2xl shadow-2xl border text-sm max-w-md flex items-start gap-3 ${
            toast.severity === 'critical'
              ? 'bg-red-950 border-red-500 text-white'
              : toast.severity === 'warning'
              ? 'bg-amber-950 border-amber-500 text-amber-100'
              : toast.severity === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-100'
              : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            {toast.severity === 'critical' ? (
              <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
            ) : toast.severity === 'warning' ? (
              <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-xs uppercase tracking-wider opacity-75">
                {toast.severity === 'critical' ? 'Urgent Alert' : 'Procurement Broadcast'}
              </div>
              <div className="text-xs font-semibold mt-0.5 leading-snug">{toast.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV/JSON Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          showToast('New Indent uploaded & broadcasted to matching suppliers!', 'success');
        }}
      />
    </div>
  );
}

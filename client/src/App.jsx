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
  Layers, RefreshCw, LogOut, ShieldCheck, User
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

  // If logged in as restricted vendor, lock activeTab to 'vendor' and set vendorId
  useEffect(() => {
    if (currentUser) {
      if (!currentUser.isAdmin) {
        setActiveTab('vendor');
        if (currentUser.vendorId) {
          setCurrentVendorId(currentUser.vendorId);
        }
      } else {
        setActiveTab('simulator');
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

  // Vendor Action: Confirm / Claim
  const handleConfirmQuantity = (vendor_id, vendor_name, sku_code, quantity) => {
    if (!socket) return;
    socket.emit('vendor:confirm', {
      vendor_id,
      vendor_name,
      sku_code,
      quantity
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

  // Admin Action: Emergency SOS Broadcast
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

  // 5:00 AM Crisis Simulation Helper
  const handleSimulate5AMBackout = () => {
    if (!indent || !indent.items) return;
    const itemWithAlloc = indent.items.find(i => 
      i.allocations.some(a => a.status === 'CONFIRMED')
    );

    if (itemWithAlloc) {
      const activeAlloc = itemWithAlloc.allocations.find(a => a.status === 'CONFIRMED');
      handleBackout(
        activeAlloc.vendor_id,
        activeAlloc.vendor_name,
        itemWithAlloc.sku_code,
        'Mandi batch damaged by heavy night rain, stock unavailable',
        activeAlloc.quantity
      );
    } else {
      showToast('First claim a stock item (e.g. 70kg Potato) to simulate a 5 AM cancellation!', 'warning');
    }
  };

  // If user is not logged in, show Login Screen
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const isAdmin = currentUser.isAdmin;

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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isAdmin 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {isAdmin ? 'ADMIN CONSOLE' : 'SUPPLIER PORTAL (RESTRICTED)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Night Indent (12:30 AM) & 5 AM Allocation</p>
            </div>
          </div>

          {/* View Mode Switcher Tabs (Only visible to Admin) */}
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('simulator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'simulator'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SplitSquareVertical size={14} />
                <span className="hidden sm:inline">Split Simulator</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 size={14} />
                <span>Command Center</span>
              </button>

              <button
                onClick={() => setActiveTab('vendor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'vendor'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone size={14} />
                <span>Vendor Mobile</span>
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
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
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
        {isAdmin && activeTab === 'simulator' && (
          <SplitViewSimulator
            indent={indent}
            summary={summary}
            vendors={vendors}
            logs={logs}
            onConfirmQuantity={handleConfirmQuantity}
            onBackout={handleBackout}
            onBroadcastSOS={handleBroadcastSOS}
            onReset={handleReset}
            onOpenUpload={() => setIsUploadOpen(true)}
            onSimulate5AMBackout={handleSimulate5AMBackout}
          />
        )}

        {isAdmin && activeTab === 'admin' && (
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
            />
            <NotificationFeed logs={logs} />
          </div>
        )}

        {(!isAdmin || activeTab === 'vendor') && (
          <div className="py-2">
            <VendorPortal
              vendors={vendors}
              currentVendorId={currentVendorId}
              onSelectVendor={setCurrentVendorId}
              indent={indent}
              onConfirmQuantity={handleConfirmQuantity}
              onBackout={handleBackout}
              isRestricted={!isAdmin}
              currentUser={currentUser}
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
                {toast.severity === 'critical' ? 'Urgent Alert' : 'Mandi Broadcast'}
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
          showToast('New Indent uploaded & broadcasted to all suppliers!', 'success');
        }}
      />
    </div>
  );
}

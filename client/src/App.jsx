import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AdminDashboard from './components/AdminDashboard';
import VendorPortal from './components/VendorPortal';
import SplitViewSimulator from './components/SplitViewSimulator';
import NotificationFeed from './components/NotificationFeed';
import UploadModal from './components/UploadModal';
import LoginPage from './components/LoginPage';
import VendorCatalogModal from './components/VendorCatalogModal';
import { 
  Building2, Smartphone, SplitSquareVertical, Bell, 
  Wifi, WifiOff, AlertTriangle, CheckCircle2, ShieldAlert,
  Layers, RefreshCw, LogOut, ShieldCheck, User, Award, ShoppingCart, Database, Package
} from 'lucide-react';

const SOCKET_URL = undefined;

// Robust React ErrorBoundary to prevent blank screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI exception in ErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold border border-amber-500/30">
            ⚠️
          </div>
          <h2 className="text-xl font-bold">Session State Restored</h2>
          <p className="text-xs text-slate-400 max-w-md">
            {this.state.error?.message || 'A temporary display state mismatch was caught.'}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Resume Portal
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pluckk_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, type: 'Local JSON Store' });
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator', 'admin', 'vendor'
  const [currentVendorId, setCurrentVendorId] = useState('v1');
  const [isVendorCatalogModalOpen, setIsVendorCatalogModalOpen] = useState(false);
  
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

  // Load DB Status
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchSkuMaster();
    fetchDbStatus();
  }, []);

  // Subscribe to real background Web Push notifications for closed-app mobile delivery
  const registerWebPush = async (user) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg || !reg.pushManager) return;

      const res = await fetch('/api/notifications/vapid-public-key');
      if (!res.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });
      }

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          vendor_id: user?.vendorId || null,
          user_email: user?.email || null
        })
      });
      console.log('[WebPush] Active subscription registered with server');
    } catch (e) {
      console.log('[WebPush] Registration note:', e.message);
    }
  };

  // Lock active tab based on role
  useEffect(() => {
    if (currentUser) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        registerWebPush(currentUser);
      }
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
        showToast(data.log.title, data.log.message, data.log.severity);
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

        // Tailor the requirement alert dynamically
        let title = data.log.title;
        let message = data.log.message;

        if (data.vendor_action) {
          const action = data.vendor_action;
          const isMe = currentUser && (
            currentUser.vendorId === action.vendor_id || 
            currentUser.name === action.vendor_name
          );

          if (isMe) {
            title = `✅ Commitment Locked: ${data.sku.item_name}`;
            message = `Your quote for ${action.allocated_qty} ${data.sku.unit} is approved @ ₹${action.quoted_rate}/${data.sku.unit}!`;
          } else {
            title = `📢 REQUIREMENT UPDATE: ${data.sku.item_name}`;
            message = `${action.allocated_qty || 'Some'} ${data.sku.unit} just locked by another supplier! ${data.sku.remaining_qty} ${data.sku.unit} remaining. Submit your quote now!`;
          }
        }

        showToast(title, message, data.log.severity || 'warning');
      }
    });

    s.on('vendor:catalog_updated', (data) => {
      setVendors(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const exists = list.some(v => v && v.id === data.vendor_id);
        if (exists) {
          return list.map(v => v.id === data.vendor_id ? (data.vendor || { ...v, supplied_skus: data.supplied_skus }) : v);
        } else if (data.vendor) {
          return [...list, data.vendor];
        }
        return list;
      });
      showToast('Catalogue Updated', `${data.vendor_name}'s catalogue updated (${data.supplied_skus.length} articles)`, 'info');
    });

    s.on('vendor:added', (data) => {
      setVendors(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some(v => v && v.id === data.vendor?.id)) return list;
        return [...list, data.vendor];
      });
      showToast('Supplier Onboarded', `New supplier added: ${data.vendor?.name}`, 'info');
    });

    s.on('notification:sos', (data) => {
      if (data.log) {
        setLogs(prev => [...prev.slice(-49), data.log]);
        showToast(data.log.title, data.log.message, 'warning');
      }
    });

    s.on('error:response', (data) => {
      showToast('Alert', data.message, 'critical');
    });

    setSocket(s);

    // Unlock audio on mobile devices upon first touch
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx.resume();
        }
      } catch (e) {}
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });

    // Re-sync immediately when mobile screen unlocks or browser tab regains focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && s.connected) {
        s.emit('get:state');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      s.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Web Audio Synthesizer Chime for Real-Time Mandi Notifications
  const playMandiNotificationSound = (severity = 'info') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (severity === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio autoplay may be muted until interaction
    }
  };

  const showToast = (arg1, arg2 = '', arg3 = 'info') => {
    let title = arg1;
    let message = arg2;
    let severity = arg3;

    if (arg2 === 'info' || arg2 === 'success' || arg2 === 'warning' || arg2 === 'critical') {
      severity = arg2;
      message = arg1;
      title = severity === 'critical' ? 'Urgent Alert' : severity === 'warning' ? 'Mandi Alert' : severity === 'success' ? 'Success' : 'Procurement Update';
    }

    setToast({ title, message: message || title, severity, id: Date.now() });

    // 1. Play alert chime
    playMandiNotificationSound(severity);

    // 2. Hardware vibration on mobile phones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // 3. Android Chrome ServiceWorker Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: message || title,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200]
          });
        }).catch(() => {
          try {
            new Notification(title, { body: message || title, icon: '/favicon.svg' });
          } catch (e) {}
        });
      } else {
        try {
          new Notification(title, { body: message || title, icon: '/favicon.svg' });
        } catch (e) {}
      }
    }

    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pluckk_user');
    sessionStorage.removeItem('pluckk_token');
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
  const handleSaveCatalog = async (vendor_id, supplied_skus, email, name) => {
    try {
      const res = await fetch(`/api/vendors/${vendor_id}/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supplied_skus,
          email: email || currentUser?.email,
          name: name || currentUser?.name
        })
      });
      const data = await res.json();
      if (res.ok && data.vendor) {
        setVendors(prev => {
          const list = Array.isArray(prev) ? prev : [];
          const exists = list.some(v => v && v.id === data.vendor.id);
          if (exists) {
            return list.map(v => v.id === data.vendor.id ? data.vendor : v);
          } else {
            return [...list, data.vendor];
          }
        });
        if (currentUser && currentUser.role === 'VENDOR') {
          const updatedUser = { ...currentUser, vendorId: data.vendor.id };
          setCurrentUser(updatedUser);
          sessionStorage.setItem('pluckk_user', JSON.stringify(updatedUser));
          setCurrentVendorId(data.vendor.id);
        }
        showToast(`Supply catalogue saved! (${supplied_skus.length} articles active)`, 'success');
      }
    } catch (e) {
      console.error('Error saving catalogue:', e);
      showToast('Error saving catalogue. Check network connection.', 'critical');
    }
  };

  // Onboard / Add a new vendor (Admin & Sourcing)
  const handleCreateVendor = async (vendorData) => {
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add vendor');
      setVendors(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some(v => v && v.id === data.vendor?.id)) return list;
        return [...list, data.vendor];
      });
      showToast(`Supplier ${data.vendor?.name} onboarded successfully!`, 'success');
      return { success: true, vendor: data.vendor };
    } catch (err) {
      showToast(err.message, 'critical');
      return { success: false, error: err.message };
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

  const activeVendorObj = (Array.isArray(vendors) && vendors.find(v => v && (
    v.id === currentVendorId || 
    (currentUser?.vendorId && v.id === currentUser.vendorId) || 
    (currentUser?.email && v.email && v.email.toLowerCase() === currentUser.email.toLowerCase())
  ))) || (Array.isArray(vendors) && vendors[0]) || {
    id: currentUser?.vendorId || currentVendorId || 'v1',
    name: currentUser?.name || 'Verified Supplier',
    email: currentUser?.email || 'vendor@pluckk.partner',
    supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03']
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs text-blue-300">
                <ShieldCheck size={14} className="text-blue-400" />
                <span className="font-semibold">1-to-1 Supplier Mode</span>
              </div>

              {/* 📦 TOP-RIGHT MY SUPPLY CATALOGUE BUTTON (Directly as circled in user's screenshot) */}
              <button
                onClick={() => setIsVendorCatalogModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 border border-emerald-500/40"
                title="Manage what articles you supply to Pluckk"
              >
                <Package size={14} />
                <span>My Supply Catalogue</span>
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {activeVendorObj.supplied_skus?.length || 0}
                </span>
              </button>
            </div>
          )}

          {/* Right Action Section: User Info, DB Status & Logout */}
          <div className="flex items-center gap-3">
            {dbStatus.connected ? (
              <div 
                className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30"
                title="Active Connection: MongoDB Atlas Cloud Database"
              >
                <Database size={12} className="text-emerald-400" />
                <span>MongoDB Atlas</span>
              </div>
            ) : (
              <div 
                className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60"
                title="Running with persistent store"
              >
                <Database size={12} className="text-slate-400" />
                <span>Persistent DB</span>
              </div>
            )}

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
            onAddVendor={handleCreateVendor}
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
              onAddVendor={handleCreateVendor}
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

      {/* Floating Real-Time Top Push Notification Banner (Optimized for Mobile & Desktop) */}
      {toast && (
        <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`p-4 rounded-3xl shadow-2xl border text-sm flex items-start gap-3 backdrop-blur-md ${
            toast.severity === 'critical'
              ? 'bg-red-950/95 border-red-500 text-white shadow-red-950/50'
              : toast.severity === 'warning'
              ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/50'
              : toast.severity === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50'
              : 'bg-slate-900/95 border-slate-700 text-white shadow-slate-950/50'
          }`}>
            {toast.severity === 'critical' ? (
              <ShieldAlert size={22} className="text-red-400 shrink-0 mt-0.5" />
            ) : toast.severity === 'warning' ? (
              <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs uppercase tracking-wider opacity-90 flex items-center justify-between">
                <span>{toast.title || (toast.severity === 'critical' ? 'Urgent Alert' : 'Procurement Broadcast')}</span>
                <span className="text-[10px] opacity-60">Live Now</span>
              </div>
              <div className="text-xs font-semibold mt-1 leading-snug text-slate-100">
                {toast.message}
              </div>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
            >
              ✕
            </button>
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

      {/* Top Header Vendor Supply Catalog Modal */}
      {isVendorCatalogModalOpen && (
        <VendorCatalogModal
          isOpen={isVendorCatalogModalOpen}
          onClose={() => setIsVendorCatalogModalOpen(false)}
          vendor={activeVendorObj}
          currentUser={currentUser}
          skuMaster={skuMaster}
          onSaveCatalog={handleSaveCatalog}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

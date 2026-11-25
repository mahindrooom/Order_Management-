import React, { useState } from 'react';
import { ShieldCheck, Lock, UserCheck, ArrowRight, Sparkles, Building2, Smartphone, AlertCircle, ShoppingCart, Award } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trimmedEmail = email.trim().toLowerCase();
  const isAdmin = trimmedEmail === 'om.mahindroo@pluckk.co.in' || trimmedEmail === 'admin@pluckk.co.in';
  const isSourcing = (trimmedEmail.endsWith('@pluckk.in') || trimmedEmail.endsWith('@pluckk.co.in')) && !isAdmin;
  const isVendor = !trimmedEmail.endsWith('@pluckk.in') && !trimmedEmail.endsWith('@pluckk.co.in');
  const hasEmail = trimmedEmail.length > 0 && trimmedEmail.includes('@');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, name: name.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store in sessionStorage for multi-tab isolation (each tab can test a separate role/vendor)
      sessionStorage.setItem('pluckk_user', JSON.stringify(data.user));
      sessionStorage.setItem('pluckk_token', data.token);

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoName) => {
    setEmail(demoEmail);
    setName(demoName);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center font-black text-2xl text-white shadow-xl shadow-emerald-500/20 mb-1">
            P
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Pluckk Procurement Portal</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Nightly Indent (12:30 AM), L1 Bidding & Catalogue Allocation Engine
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Sign In to Continue</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Lock size={12} />
              <span>3-Tier Access</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@pluckk.in or vendor@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Display Name <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Om Mahindroo or Ramesh Mandi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Dynamic Role Access Indicator */}
            {hasEmail && (
              <div className={`p-3.5 rounded-2xl border text-xs transition-all duration-200 ${
                isAdmin 
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-300' 
                  : isSourcing
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-0.5">
                  {isAdmin ? <Award size={16} /> : isSourcing ? <ShoppingCart size={16} /> : <Smartphone size={16} />}
                  <span>
                    {isAdmin 
                      ? '👑 Executive Admin (Full System Control)' 
                      : isSourcing 
                      ? '🛒 Sourcing Ops (Upload Indents & L1 Bidding)' 
                      : '🚚 Supplier Portal (Catalogue-Filtered 1-to-1)'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isAdmin 
                    ? 'Granted master rights: SKU master catalog, 4-pillar vendor rating configurations, full sourcing controls & overrides.' 
                    : isSourcing
                    ? 'Granted sourcing rights: Upload 12:30 AM indents, review quotes, least-cost L1 awards, manage supplier catalogues, export POs.'
                    : 'Granted supplier rights: Clean view of articles in your supply catalogue, submit competitive quotes, report shortfalls anytime.'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !hasEmail}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
            >
              {loading ? (
                <span>Verifying Access...</span>
              ) : (
                <>
                  <span>Sign In as {isAdmin ? 'Pluckk Admin' : isSourcing ? 'Sourcing Lead' : 'Supplier'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" />
                <span>3-Tier Access Accounts:</span>
              </span>
              <span className="text-slate-500 text-[10px]">Tap to test</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* ADMIN */}
              <button
                type="button"
                onClick={() => handleQuickLogin('om.mahindroo@pluckk.co.in', 'Om Mahindroo')}
                className="w-full p-2.5 rounded-xl bg-purple-950/30 hover:bg-purple-950/50 border border-purple-500/30 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <span>👑 Admin: om.mahindroo@pluckk.co.in</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Full admin rights, SKU master, vendor 4-pillar ratings</div>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">ADMIN</span>
              </button>

              {/* SOURCING */}
              <button
                type="button"
                onClick={() => handleQuickLogin('procurement@pluckk.in', 'Pluckk Sourcing Lead')}
                className="w-full p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-500/30 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>🛒 Sourcing: procurement@pluckk.in</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Upload indents, review quotes, least-cost L1 awards, POs</div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">SOURCING</span>
              </button>

              {/* VENDORS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ramesh.traders@gmail.com', 'Ramesh Mandi Traders')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition"
                >
                  <div className="font-bold text-blue-400">Ramesh Traders</div>
                  <div className="text-[10px] text-slate-400 truncate">Potato, Onion, Tomato</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('kisan.fruits@outlook.com', 'Kisan Fruits Hub')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition"
                >
                  <div className="font-bold text-amber-400">Kisan Fruits</div>
                  <div className="text-[10px] text-slate-400 truncate">Fruits only (Banana, Pomegranate)</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          Admin: <strong>om.mahindroo@pluckk.co.in</strong> • Sourcing: <strong>*@pluckk.in / *@pluckk.co.in</strong> • Suppliers: <strong>External Emails</strong>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ShieldCheck, Lock, UserCheck, ArrowRight, Sparkles, Building2, Smartphone, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trimmedEmail = email.trim().toLowerCase();
  const isAdmin = trimmedEmail.endsWith('@pluckk.in') || trimmedEmail.endsWith('@pluckk.co.in');
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
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, name: name.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store in localStorage
      localStorage.setItem('pluckk_user', JSON.stringify(data.user));
      localStorage.setItem('pluckk_token', data.token);

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
            Nightly Indent (12:30 AM) & 5:00 AM Mandi Real-Time Allocation Engine
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Sign In to Continue</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Lock size={12} />
              <span>Role-Based Access</span>
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
                placeholder="e.g. Ramesh Traders or Amit Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Dynamic Role Access Indicator */}
            {hasEmail && (
              <div className={`p-3 rounded-2xl border text-xs transition-all duration-200 ${
                isAdmin 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-0.5">
                  {isAdmin ? <Building2 size={16} /> : <Smartphone size={16} />}
                  <span>
                    {isAdmin ? '🛡️ Pluckk Official (Admin Access Granted)' : '🚚 Supplier Portal (Restricted Access)'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isAdmin 
                    ? 'Granted full admin rights: Upload indents, monitor all suppliers, broadcast SOS, export POs.' 
                    : 'Granted 1-to-1 supplier rights: View available items, claim quantities, report 5 AM shortages.'}
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
                  <span>Sign In as {isAdmin ? 'Pluckk Admin' : 'Supplier'}</span>
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
                <span>1-Click Test Accounts:</span>
              </span>
              <span className="text-slate-500 text-[10px]">Tap to test</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('procurement@pluckk.in', 'Pluckk Procurement Lead')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition"
              >
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>@pluckk.in</span>
                  <span className="text-[9px] bg-emerald-500/20 px-1 rounded">Admin</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-0.5">procurement@pluckk.in</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ops@pluckk.co.in', 'Pluckk Operations')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition"
              >
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>@pluckk.co.in</span>
                  <span className="text-[9px] bg-emerald-500/20 px-1 rounded">Admin</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-0.5">ops@pluckk.co.in</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ramesh.traders@gmail.com', 'Ramesh Mandi Traders')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition"
              >
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <span>Ramesh (Potato/Onion)</span>
                  <span className="text-[9px] bg-blue-500/20 px-1 rounded">Vendor</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">ramesh.traders@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('suresh.agro@yahoo.com', 'Suresh Greenfield Agro')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition"
              >
                <div className="font-bold text-purple-400 flex items-center gap-1">
                  <span>Suresh (Leafy/Veg)</span>
                  <span className="text-[9px] bg-purple-500/20 px-1 rounded">Vendor</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">suresh.agro@yahoo.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          Emails ending in <strong>@pluckk.in</strong> or <strong>@pluckk.co.in</strong> receive Admin Access. All other emails receive Restricted Supplier Access.
        </div>
      </div>
    </div>
  );
}

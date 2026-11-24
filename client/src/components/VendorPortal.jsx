import React, { useState } from 'react';
import { 
  Package, Check, CheckCircle2, AlertCircle, Lock, 
  Send, AlertTriangle, ChevronDown, User, ShieldCheck, 
  Clock, ArrowRight, CornerDownRight, X
} from 'lucide-react';

export default function VendorPortal({ 
  vendors, 
  currentVendorId, 
  onSelectVendor, 
  indent, 
  onConfirmQuantity, 
  onBackout, 
  compact = false,
  isRestricted = false,
  currentUser = null
}) {
  const currentVendor = vendors.find(v => v.id === currentVendorId) || vendors[0];
  const [selectedSku, setSelectedSku] = useState(null);
  const [customQty, setCustomQty] = useState('');
  const [backoutReason, setBackoutReason] = useState('');
  const [backoutSku, setBackoutSku] = useState(null);
  const [backoutDropQty, setBackoutDropQty] = useState('');

  // Find all commitments made by this vendor
  const myCommitments = (indent?.items || []).flatMap(item => {
    const alloc = item.allocations.find(a => a.vendor_id === currentVendor.id && a.status === 'CONFIRMED');
    if (alloc) {
      return [{
        sku_code: item.sku_code,
        item_name: item.item_name,
        unit: item.unit,
        target_rate: item.target_rate,
        committed_qty: alloc.quantity,
        timestamp: alloc.timestamp
      }];
    }
    return [];
  });

  const handleClaim = (sku_code, qty) => {
    onConfirmQuantity(currentVendor.id, currentVendor.name, sku_code, qty);
    setSelectedSku(null);
    setCustomQty('');
  };

  const handleBackoutSubmit = (e) => {
    e.preventDefault();
    if (!backoutSku) return;
    onBackout(
      currentVendor.id, 
      currentVendor.name, 
      backoutSku.sku_code, 
      backoutReason || 'Shortage in morning mandi',
      backoutDropQty ? parseFloat(backoutDropQty) : null
    );
    setBackoutSku(null);
    setBackoutReason('');
    setBackoutDropQty('');
  };

  return (
    <div className={`space-y-5 ${compact ? 'max-w-md mx-auto' : 'max-w-2xl mx-auto'}`}>
      {/* Mobile Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
              P
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Pluckk Supplier Portal</div>
              <div className="text-sm font-bold text-white">Daily Mandi Procurement</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Sync</span>
          </div>
        </div>

        {/* Vendor Selector Pill or Fixed Supplier View */}
        <div className="pt-2 border-t border-slate-800">
          {isRestricted ? (
            <div className="flex items-center justify-between text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Verified Supplier:</span>
                <span className="font-bold text-white text-sm">{currentUser?.name || currentVendor.name}</span>
                <span className="text-[11px] text-slate-400 block font-mono">{currentUser?.email || currentVendor.email}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg font-semibold">
                1-to-1 Verified
              </span>
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Acting as Supplier (Switch to test):</label>
              <div className="grid grid-cols-2 gap-1.5">
                {vendors.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelectVendor(v.id)}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-xs transition border flex items-center justify-between ${
                      v.id === currentVendor.id
                        ? 'bg-emerald-600 text-white font-semibold border-emerald-500 shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate">{v.name.split(' ')[0]} {v.name.split(' ')[1] || ''}</span>
                    <span className="text-[10px] opacity-75">★{v.rating}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1-to-1 Privacy Note */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-400">
        <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
        <span>
          <strong>1-to-1 Channel:</strong> You only see Pluckk's open demand. Other suppliers cannot see your rates or confirmed quantities.
        </span>
      </div>

      {/* My Commitments Section */}
      {myCommitments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Your Confirmed Commitments ({myCommitments.length})
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">Ready for morning gate</span>
          </div>

          <div className="space-y-2">
            {myCommitments.map((c) => (
              <div 
                key={c.sku_code} 
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{c.item_name}</div>
                  <div className="text-xs text-emerald-400 font-bold mt-0.5">
                    {c.committed_qty} {c.unit} confirmed @ ₹{c.target_rate}/{c.unit}
                  </div>
                </div>

                {/* Instant Shortfall / Release Button */}
                <button
                  onClick={() => {
                    setBackoutSku(c);
                    setBackoutDropQty(c.committed_qty.toString());
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition shrink-0"
                  title="Report stock shortfall or release your allocation"
                >
                  Report Shortfall / Release
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Open Indent Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available Indent Requirements
          </h3>
          <span className="text-xs text-slate-500">
            {(indent?.items || []).filter(i => i.remaining_qty > 0).length} items open
          </span>
        </div>

        {(indent?.items || []).map((item) => {
          const isFulfilled = item.remaining_qty === 0;
          const myAlloc = item.allocations.find(a => a.vendor_id === currentVendor.id && a.status === 'CONFIRMED');
          const isSelected = selectedSku === item.sku_code;

          return (
            <div 
              key={item.sku_code}
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                isFulfilled 
                  ? 'bg-slate-950/60 border-slate-800/50 opacity-60' 
                  : item.status === 'PARTIALLY_FULFILLED'
                  ? 'bg-slate-900 border-amber-500/30 shadow-sm'
                  : 'bg-slate-900 border-slate-800 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-base">{item.item_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Rate: <strong className="text-emerald-400 font-semibold">₹{item.target_rate}/{item.unit}</strong> • Target: {item.required_qty} {item.unit}
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  {isFulfilled ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                      <Lock size={12} /> Requirement Closed
                    </span>
                  ) : item.status === 'PARTIALLY_FULFILLED' ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      {item.remaining_qty} {item.unit} Still Needed!
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {item.remaining_qty} {item.unit} Needed
                    </span>
                  )}
                </div>
              </div>

              {/* My active allocation note */}
              {myAlloc && (
                <div className="mt-2.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center justify-between">
                  <span>You have committed: <strong>{myAlloc.quantity} {item.unit}</strong></span>
                  <Check size={14} />
                </div>
              )}

              {/* Notification & Action Area */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/80">
                {isFulfilled ? (
                  <div className="text-xs text-slate-400 flex items-center gap-2 italic">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Demand fulfilled by another supplier. <strong>Do not procure stock.</strong></span>
                  </div>
                ) : (
                  <div>
                    {isSelected ? (
                      <div className="space-y-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                        <label className="text-xs font-semibold text-slate-300 block">
                          Enter quantity you can supply (Max {item.remaining_qty} {item.unit}):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={item.remaining_qty}
                            placeholder={`e.g. ${Math.min(50, item.remaining_qty)}`}
                            value={customQty}
                            onChange={(e) => setCustomQty(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => handleClaim(item.sku_code, customQty)}
                            disabled={!customQty || parseFloat(customQty) <= 0 || parseFloat(customQty) > item.remaining_qty}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setSelectedSku(null)}
                            className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleClaim(item.sku_code, item.remaining_qty)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-sm active:scale-98"
                        >
                          <Check size={14} />
                          <span>Supply Full ({item.remaining_qty} {item.unit})</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedSku(item.sku_code);
                            setCustomQty(Math.floor(item.remaining_qty / 2).toString());
                          }}
                          className="py-2 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
                        >
                          Partial Qty
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5:00 AM Shortage / Dropout Modal */}
      {backoutSku && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-red-400 font-bold">
                <AlertTriangle size={20} />
                <span>Report Stock Shortfall / Release Demand</span>
              </div>
              <button onClick={() => setBackoutSku(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Reporting a stock issue or release for <strong>{backoutSku.item_name}</strong>. The system will immediately notify Pluckk and reopen the demand to alternative suppliers.
            </p>

            <form onSubmit={handleBackoutSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  How many kg can you NOT supply? (Max {backoutSku.committed_qty} {backoutSku.unit}):
                </label>
                <input
                  type="number"
                  max={backoutSku.committed_qty}
                  min="1"
                  required
                  value={backoutDropQty}
                  onChange={(e) => setBackoutDropQty(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Reason for shortfall / stock release:</label>
                <select
                  value={backoutReason}
                  onChange={(e) => setBackoutReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
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
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
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

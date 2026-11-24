import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import VendorPortal from './VendorPortal';
import { Smartphone, Monitor, ArrowRight, Zap } from 'lucide-react';

export default function SplitViewSimulator({
  indent,
  summary,
  vendors,
  logs,
  onConfirmQuantity,
  onBackout,
  onBroadcastSOS,
  onReset,
  onOpenUpload,
  onSimulate5AMBackout
}) {
  const [vendor1Id, setVendor1Id] = useState('v1'); // Ramesh
  const [vendor2Id, setVendor2Id] = useState('v2'); // Suresh

  return (
    <div className="space-y-4">
      {/* Simulation Info Bar */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive Real-Time Test Simulation</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                Active WebSocket Live Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Test how Pluckk Official and multiple suppliers interact simultaneously in real-time.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
          💡 <strong>Try this test:</strong> On Supplier 1, claim 70kg Potato. Watch Supplier 2's screen update to "Only 30kg left" instantly!
        </div>
      </div>

      {/* Grid: Admin on Left, 2 Vendors on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Admin Command Center (7 cols) */}
        <div className="xl:col-span-7 bg-slate-950/70 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Pluckk Procurement Command Center</h3>
            </div>
            <span className="text-xs text-slate-400">Many-to-One Monitoring</span>
          </div>

          <AdminDashboard
            indent={indent}
            summary={summary}
            vendors={vendors}
            logs={logs}
            onBroadcastSOS={onBroadcastSOS}
            onReset={onReset}
            onOpenUpload={onOpenUpload}
            onSimulate5AMBackout={onSimulate5AMBackout}
          />
        </div>

        {/* Right: Live Vendor Portals (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Vendor 1 Mobile View */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Supplier Screen 1 (e.g. Ramesh)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">1-to-1 Channel</span>
            </div>

            <VendorPortal
              vendors={vendors}
              currentVendorId={vendor1Id}
              onSelectVendor={setVendor1Id}
              indent={indent}
              onConfirmQuantity={onConfirmQuantity}
              onBackout={onBackout}
              compact={true}
            />
          </div>

          {/* Vendor 2 Mobile View */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Supplier Screen 2 (e.g. Suresh)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">1-to-1 Channel</span>
            </div>

            <VendorPortal
              vendors={vendors}
              currentVendorId={vendor2Id}
              onSelectVendor={setVendor2Id}
              indent={indent}
              onConfirmQuantity={onConfirmQuantity}
              onBackout={onBackout}
              compact={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

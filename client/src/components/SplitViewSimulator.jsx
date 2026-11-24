import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import VendorPortal from './VendorPortal';
import { Smartphone, Monitor, ArrowRight, Zap, TrendingDown } from 'lucide-react';

export default function SplitViewSimulator({
  indent,
  summary,
  vendors,
  logs,
  onBid,
  onBackout,
  onBroadcastSOS,
  onReset,
  onOpenUpload,
  onSimulate5AMBackout,
  currentUser,
  skuMaster,
  onSaveCatalog,
  onUpdateVendorRatings,
  onAddVendor
}) {
  const [vendor1Id, setVendor1Id] = useState('v1'); // Ramesh
  const [vendor2Id, setVendor2Id] = useState('v2'); // Suresh

  return (
    <div className="space-y-4">
      {/* Simulation Info Bar */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive L1 Bidding & Catalogue Simulator</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                Live Engine Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Test how Pluckk's Lowest Price (L1) Engine awards orders and resolves ties using vendor ratings.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700">
          💡 <strong>Try this L1 test:</strong> Supplier 1 quotes ₹27 for 50kg. Supplier 2 quotes ₹28 for 100kg. System gives 50kg to Supplier 1 (cheaper rate) and remaining 50kg to Supplier 2!
        </div>
      </div>

      {/* Grid: Admin/Sourcing on Left, 2 Vendors on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Admin Command Center (7 cols) */}
        <div className="xl:col-span-7 bg-slate-950/70 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Pluckk Procurement Command Center</h3>
            </div>
            <span className="text-xs text-slate-400">Lowest Price (L1) Allocation View</span>
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
            currentUser={currentUser}
            skuMaster={skuMaster}
            onSaveCatalog={onSaveCatalog}
            onUpdateVendorRatings={onUpdateVendorRatings}
            onAddVendor={onAddVendor}
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
                  Supplier 1 (e.g. Ramesh)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Catalogue Filtered</span>
            </div>

            <VendorPortal
              vendors={vendors}
              currentVendorId={vendor1Id}
              onSelectVendor={setVendor1Id}
              indent={indent}
              onBid={onBid}
              onBackout={onBackout}
              compact={true}
              skuMaster={skuMaster}
              onSaveCatalog={onSaveCatalog}
            />
          </div>

          {/* Vendor 2 Mobile View */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Supplier 2 (e.g. Suresh)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Catalogue Filtered</span>
            </div>

            <VendorPortal
              vendors={vendors}
              currentVendorId={vendor2Id}
              onSelectVendor={setVendor2Id}
              indent={indent}
              onBid={onBid}
              onBackout={onBackout}
              compact={true}
              skuMaster={skuMaster}
              onSaveCatalog={onSaveCatalog}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

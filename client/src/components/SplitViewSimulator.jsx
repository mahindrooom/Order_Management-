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
  onAddVendor,
  onTrigger5AmAllocation,
  onReopenBiddingWindow,
  onInitiateFFF,
  onReviewFFF,
  onApplyFFF
}) {
  const [vendor1Id, setVendor1Id] = useState('v1'); // Ramesh
  const [vendor2Id, setVendor2Id] = useState('v2'); // Suresh

  return (
    <div className="space-y-4">
      {/* Simulation Info Bar */}
      <div className="bg-white border border-emerald-300 rounded-3xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Interactive L1 Bidding & Catalogue Simulator</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                Live Engine Active
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Test how Pluckk's Lowest Price (L1) Engine awards orders and resolves ties using vendor ratings.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-700 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200">
          💡 <strong>Try this L1 test:</strong> Supplier 1 quotes ₹27 for 50kg. Supplier 2 quotes ₹28 for 100kg. System gives 50kg to Supplier 1 (cheaper rate) and remaining 50kg to Supplier 2!
        </div>
      </div>

      {/* Grid: Admin/Sourcing on Left, 2 Vendors on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Admin Command Center (7 cols) */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Pluckk Procurement Command Center</h3>
            </div>
            <span className="text-xs text-slate-500">Lowest Price (L1) Allocation View</span>
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
            onTrigger5AmAllocation={onTrigger5AmAllocation}
            onReopenBiddingWindow={onReopenBiddingWindow}
            onInitiateFFF={onInitiateFFF}
            onReviewFFF={onReviewFFF}
          />
        </div>

        {/* Right: Live Vendor Portals (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Vendor 1 Mobile View */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Supplier 1 (e.g. Ramesh)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Catalogue Filtered</span>
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
              onApplyFFF={onApplyFFF}
            />
          </div>

          {/* Vendor 2 Mobile View */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Supplier 2 (e.g. Suresh)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Catalogue Filtered</span>
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
              onApplyFFF={onApplyFFF}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

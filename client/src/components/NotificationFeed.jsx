import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, Clock, ArrowRight } from 'lucide-react';

export default function NotificationFeed({ logs = [] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Live Mandi Event Stream & WhatsApp Dispatches
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Auto-synced</span>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {logs.slice().reverse().map((log) => {
          const isCritical = log.severity === 'critical';
          const isWarning = log.severity === 'warning';
          const isSuccess = log.severity === 'success';

          return (
            <div
              key={log.id}
              className={`p-3 rounded-xl border text-xs transition ${
                isCritical
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : isWarning
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : isSuccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  {isCritical ? (
                    <ShieldAlert size={14} className="text-red-600" />
                  ) : isWarning ? (
                    <AlertTriangle size={14} className="text-amber-600" />
                  ) : isSuccess ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <Clock size={14} className="text-blue-600" />
                  )}
                  <span>{log.title}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-700">{log.message}</p>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400">
            No events logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

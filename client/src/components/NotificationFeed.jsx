import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, Clock, ArrowRight } from 'lucide-react';

export default function NotificationFeed({ logs = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Live Mandi Event Stream & WhatsApp Dispatches
          </h3>
        </div>
        <span className="text-[11px] text-slate-500">Auto-synced</span>
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
                  ? 'bg-red-950/40 border-red-500/40 text-red-200'
                  : isWarning
                  ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                  : isSuccess
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  {isCritical ? (
                    <ShieldAlert size={14} className="text-red-400" />
                  ) : isWarning ? (
                    <AlertTriangle size={14} className="text-amber-400" />
                  ) : isSuccess ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <Clock size={14} className="text-blue-400" />
                  )}
                  <span>{log.title}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed opacity-90">{log.message}</p>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">
            No events logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

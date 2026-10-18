import React from 'react';
import {
  Inbox,
  Gavel,
  CheckCircle2,
  XCircle,
  Users,
  Radio,
} from 'lucide-react';

export function CommandSidebar({
  activeTab,
  onSelectTab,
  pendingCount,
  disputedCount,
  approvedCount,
  rejectedCount,
}) {
  const tabs = [
    {
      key: 'Pending Queue',
      label: 'Pending Queue',
      Icon: Inbox,
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
      badgeTone: 'bg-accent/20 text-accent border-accent/40',
      description: 'Awaiting certified warden audit',
    },
    {
      key: 'Disputed Cases',
      label: 'Disputed Cases',
      Icon: Gavel,
      badge: disputedCount > 0 ? String(disputedCount) : undefined,
      badgeTone: 'bg-telemetry/20 text-telemetry border-telemetry/40',
      description: 'PKR 100 Citizen Review Fee Paid',
    },
    {
      key: 'Approved Today',
      label: 'Approved Today',
      Icon: CheckCircle2,
      badge: approvedCount > 0 ? String(approvedCount) : undefined,
      badgeTone: 'bg-valid/20 text-valid border-valid/40',
      description: 'Issued e-citations & paid bounties',
    },
    {
      key: 'Rejected Cases',
      label: 'Dismissed Reports',
      Icon: XCircle,
      badge: rejectedCount > 0 ? String(rejectedCount) : undefined,
      badgeTone: 'bg-surface text-muted border-edge',
      description: 'Insufficient clarity or lawful traffic',
    },
    {
      key: 'Reporter Registry',
      label: 'Reporter Registry',
      Icon: Users,
      description: 'Citizens trust scores & CNIC audit',
    },
  ];

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-edge bg-surface/40">
      <div>
        {/* Navigation Items */}
        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            Enforcement Workspaces
          </p>
          <nav className="space-y-1">
            {tabs.map(({ key, label, Icon, badge, badgeTone }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectTab(key)}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? 'border-l-2 border-accent bg-surface text-ink shadow-sm'
                      : 'border-l-2 border-transparent text-muted hover:bg-surface/50 hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-accent' : 'text-muted group-hover:text-ink'
                      }`}
                    />
                    <div>
                      <span className="text-xs font-semibold leading-none">{label}</span>
                    </div>
                  </div>

                  {badge && (
                    <span
                      className={`tabular rounded-full border px-2 py-0.5 text-2xs font-bold ${badgeTone}`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Audit Protocol Reference */}
        <div className="mx-3 mt-4 rounded-xl border border-edge bg-canvas/40 p-3">
          <div className="flex items-center gap-2 text-2xs font-bold text-telemetry">
            <Radio className="h-3.5 w-3.5 text-telemetry animate-pulse" />
            <span>SEC 15 LEGAL AUDIT PROTOCOL</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Review decisions require distinct plate legibility and confirmed infraction frames. Approved disputes auto-refund PKR 100 review fee + PKR 200 bounty to citizen.
          </p>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="border-t border-edge p-3">
        <div className="flex items-center justify-between rounded-lg bg-canvas/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-valid animate-ping" />
            <span className="text-2xs font-semibold text-muted">Supabase Realtime</span>
          </div>
          <span className="text-2xs font-bold text-valid">CONNECTED</span>
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import {
  Inbox,
  Gavel,
  CheckCircle2,
  XCircle,
  Users,
  Radio,
  ShieldCheck,
  UserCheck,
  Building,
  Shield,
  MapPin,
  Clock,
} from 'lucide-react';

export function CommandSidebar({
  activeTab,
  onSelectTab,
  pendingCount,
  disputedCount,
  approvedCount,
  rejectedCount,
  divisionOfficersCount = 0,
  currentDivision,
  currentRole = 'review_officer',
  currentUser,
}) {
  const isAdmin = currentRole === 'division_admin';

  // Workspaces visible to Enforcement Officers
  const officerTabs = [
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
      <div className="overflow-y-auto thin-scroll">
        {/* ========================================================= */}
        {/* ADMIN EXCLUSIVE: Division Management (Only for Admin!)    */}
        {/* ========================================================= */}
        {isAdmin && (
          <div className="px-3 pt-4">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
              <span>Admin Directorate</span>
              <span className="rounded bg-accent/20 px-1.5 py-0.2 text-[9px] font-bold text-accent">
                COMMAND
              </span>
            </p>

            <button
              onClick={() => onSelectTab('Division Administration')}
              className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                activeTab === 'Division Administration'
                  ? 'border-l-2 border-accent bg-accent/15 text-ink shadow-glow-amber ring-1 ring-accent/30'
                  : 'border-l-2 border-transparent text-muted hover:bg-surface/70 hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    activeTab === 'Division Administration'
                      ? 'text-accent'
                      : 'text-muted group-hover:text-accent'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold leading-none block">
                    Division Admin Portal
                  </span>
                  <span className="text-[10px] text-muted">
                    Provision & manage officers
                  </span>
                </div>
              </div>

              <span className="tabular rounded-full border border-accent/40 bg-accent/20 px-2 py-0.5 text-2xs font-bold text-accent">
                {divisionOfficersCount}
              </span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* Navigation Items: Enforcement Workspaces                  */}
        {/* ========================================================= */}
        <div className="px-3 pt-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            {isAdmin ? 'Regional Review Audit' : 'Enforcement Workspaces'}
          </p>
          <nav className="space-y-1">
            {officerTabs.map(({ key, label, Icon, badge, badgeTone }) => {
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

        {/* ========================================================= */}
        {/* Role & Division Assignment Information Box (NO SWITCH!)   */}
        {/* ========================================================= */}
        <div className="mx-3 mt-5 rounded-xl border border-edge bg-canvas/60 p-3">
          <div className="flex items-center justify-between text-2xs text-muted">
            <span className="font-bold uppercase tracking-wider">
              {isAdmin ? 'Division Command HQ' : 'Assigned Station'}
            </span>
            <span className="font-mono text-accent font-bold">{currentDivision?.code}</span>
          </div>

          <p className="mt-1 text-xs font-bold text-ink truncate">
            {currentDivision?.name}
          </p>

          {isAdmin ? (
            <div className="mt-2 space-y-1 text-2xs text-muted border-t border-edge/60 pt-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-accent shrink-0" />
                <span className="text-ink font-semibold">Sole Division Admin</span>
              </div>
              <p className="truncate text-muted">{currentDivision?.hq}</p>
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-2xs text-muted border-t border-edge/60 pt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-telemetry shrink-0" />
                <span className="truncate">Sector: {currentUser?.sector || 'Mall Road'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-muted shrink-0" />
                <span className="truncate">Admin: {currentDivision?.admin?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit Protocol Reference */}
        <div className="mx-3 mt-4 rounded-xl border border-edge bg-canvas/40 p-3">
          <div className="flex items-center gap-2 text-2xs font-bold text-telemetry">
            <Radio className="h-3.5 w-3.5 text-telemetry animate-pulse" />
            <span>LEGAL AUDIT PROTOCOL</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {isAdmin
              ? 'Division Chief oversees officer compliance. Each division has strictly 1 Admin.'
              : 'Review decisions require distinct plate legibility and confirmed infraction frames.'}
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

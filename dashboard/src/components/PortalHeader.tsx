import React from 'react';
import { ShieldCheck, Search, RefreshCw, Bell, UserCheck, ShieldAlert } from 'lucide-react';

interface PortalHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  pendingCount: number;
  disputedCount: number;
  approvedCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function PortalHeader({
  searchQuery,
  onSearchChange,
  pendingCount,
  disputedCount,
  approvedCount,
  onRefresh,
  isRefreshing,
}: PortalHeaderProps) {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-edge bg-surface/80 px-6 backdrop-blur-md">
      {/* Left: Branding & Officer Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/15 text-accent shadow-glow-amber">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-bold tracking-tight text-ink">
                RoadWatch Enforcement Command
              </h1>
              <span className="rounded bg-valid/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-valid">
                LIVE
              </span>
            </div>
            <p className="text-2xs font-medium text-muted">
              Punjab Traffic Police · Mall Road Division · Station #12
            </p>
          </div>
        </div>
      </div>

      {/* Center: Live Search */}
      <div className="relative w-80 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search plate (e.g. LEA-4471) or Case ID..."
          className="w-full rounded-lg border border-edge bg-canvas/70 py-1.5 pl-9 pr-3 text-xs text-ink placeholder-muted transition-colors focus:border-telemetry focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-muted hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {/* Right: Live Shift Metrics & Refresh */}
      <div className="flex items-center gap-3">
        {/* Metric Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-canvas/50 px-2.5 py-1 text-2xs">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="font-semibold text-muted">Queue:</span>
            <span className="tabular font-bold text-accent">{pendingCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-canvas/50 px-2.5 py-1 text-2xs">
            <ShieldAlert className="h-3 w-3 text-telemetry" />
            <span className="font-semibold text-muted">Disputed:</span>
            <span className="tabular font-bold text-telemetry">{disputedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-canvas/50 px-2.5 py-1 text-2xs">
            <span className="h-2 w-2 rounded-full bg-valid" />
            <span className="font-semibold text-muted">Approved:</span>
            <span className="tabular font-bold text-valid">{approvedCount}</span>
          </div>
        </div>

        {/* Sync / Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Sync live cases from Supabase"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-surface text-muted transition hover:border-telemetry hover:text-telemetry"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-telemetry' : ''}`} />
        </button>

        {/* Officer Badge */}
        <div className="flex items-center gap-2.5 border-l border-edge pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface text-muted">
            <UserCheck className="h-4 w-4 text-valid" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-ink">Insp. A. Raheem</p>
            <p className="text-[10px] text-muted">Badge: PTP-2291</p>
          </div>
        </div>
      </div>
    </header>
  );
}

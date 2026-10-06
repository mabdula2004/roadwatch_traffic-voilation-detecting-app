import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRightIcon,
  BanknoteIcon,
  ChevronRightIcon,
  ClockIcon } from
'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { fines } from '../../data/fines';

export function Wallet() {
  const active = fines.filter((f) => f.status !== 'paid');

  return (
    <div className="min-h-full px-4 pb-28 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Citizen Wallet</h1>
          <p className="mt-0.5 text-xs text-muted">Reward balance &amp; citations against LEA-4471</p>
        </div>
      </div>

      {/* Earnings */}
      <section className="mt-3 rounded-2xl border border-accent/30 bg-surface p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-muted">
              <BanknoteIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Reward balance</span>
            </div>
            <p className="tabular mt-1.5 font-display text-[32px] font-bold leading-none text-ink">
              PKR 1,500
            </p>
            <p className="mt-1.5 text-2xs text-muted">PKR 300 pending clearance · 5 reports</p>
          </div>
          <Badge tone="accent">e-Pay linked</Badge>
        </div>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98]">
          
          Withdraw to e-Pay
          <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>

      {/* Fines against user's vehicle */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-ink">Citations against LEA-4471</h2>
        <span className="tabular text-2xs font-semibold text-signal">{active.length} active</span>
      </div>

      <ul className="mt-2.5 space-y-2.5">
        {active.map((f) =>
        <li key={f.id}>
            <Link
            to={`/wallet/fine/${f.id}`}
            className="flex items-center gap-3 rounded-2xl border border-edge bg-surface p-3.5 transition-colors duration-150 ease-out hover:border-signal/50">
            
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-ink">{f.violation}</p>
                  {f.status === 'disputed' && <Badge tone="telemetry">In dispute</Badge>}
                </div>
                <p className="tabular mt-1 text-2xs text-muted">
                  {f.id} · {f.issuedAt}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="tabular font-display text-sm font-bold text-accent">
                    PKR {f.amountPkr.toLocaleString()}
                  </span>
                  <span className="tabular inline-flex items-center gap-1 text-2xs font-semibold text-signal">
                    <ClockIcon className="h-3 w-3" aria-hidden="true" />
                    {f.slaHoursLeft}h left
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </Link>
          </li>
        )}
      </ul>
    </div>);

}
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeftIcon,
  PlayIcon,
  GavelIcon,
  AlertTriangleIcon,
  MapPinIcon,
  UserIcon,
  HashIcon } from
'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { fines } from '../../data/fines';
import { media, type MediaKey } from '../../data/media';
import { useToast } from '../../contexts/ToastContext';

function useCountdown(hours: number) {
  const [secs, setSecs] = useState(hours * 3600);
  useEffect(() => {
    const t = window.setInterval(() => setSecs((s) => s > 0 ? s - 1 : 0), 1000);
    return () => window.clearInterval(t);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor(secs % 3600 / 60);
  const s = secs % 60;
  return { h, m, s, pct: Math.min(secs / (48 * 3600) * 100, 100) };
}

export function FineDetails() {
  const { fineId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const fine = fines.find((f) => f.id === fineId) ?? fines[0];
  const { h, m, s, pct } = useCountdown(fine.slaHoursLeft);

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-edge bg-canvas/95 px-4 py-3 backdrop-blur">
        <Link
          to="/wallet"
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink">
          
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to Wallet
        </Link>
        <Badge tone={fine.status === 'disputed' ? 'telemetry' : 'danger'}>
          {fine.status === 'disputed' ? 'UNDER REVIEW' : 'PAYMENT DUE'}
        </Badge>
      </header>

      <div className="px-4 pt-4">
        {/* Offense card */}
        <section className="rounded-2xl border border-edge bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-muted">
                <HashIcon className="h-3 w-3" aria-hidden="true" />
                <span className="tabular text-[10px] font-bold uppercase tracking-wider">
                  8070 alert · ref {fine.id}
                </span>
              </div>
              <h1 className="mt-1.5 font-display text-xl font-bold leading-tight text-ink">
                {fine.violation}
              </h1>
              <p className="tabular mt-1 text-2xs text-muted">
                {fine.plate} · {fine.issuedAt}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted">Fine</p>
              <p className="tabular font-display text-2xl font-bold leading-tight text-accent">
                {fine.amountPkr.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-muted">PKR</p>
            </div>
          </div>

          {/* Evidence snippet */}
          <figure className="mt-4 overflow-hidden rounded-xl border border-edge bg-black">
            <div className="relative aspect-video">
              <img
                src={media[fine.evidenceThumb as MediaKey]}
                alt={`Evidence clip snippet for ${fine.violation}`}
                className="h-full w-full object-cover" />
              
              <button
                type="button"
                aria-label={`Play ${fine.clipSeconds} second evidence snippet`}
                className="absolute inset-0 flex items-center justify-center bg-canvas/25">
                
                <span className="glass flex h-12 w-12 items-center justify-center rounded-full">
                  <PlayIcon className="ml-0.5 h-4 w-4 text-ink" aria-hidden="true" />
                </span>
              </button>
              <span className="tabular glass absolute bottom-2.5 right-2.5 rounded-md px-2 py-1 text-[10px] font-semibold text-ink">
                00:0{fine.clipSeconds % 10}
              </span>
            </div>
          </figure>

          <dl className="mt-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Location
              </dt>
              <dd className="max-w-[58%] text-right text-xs font-semibold text-ink">{fine.location}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Verifying officer
              </dt>
              <dd className="max-w-[58%] text-right text-xs font-semibold text-ink">{fine.officer}</dd>
            </div>
          </dl>
        </section>

        {/* SLA countdown */}
        <section className="mt-3 rounded-2xl border border-signal/30 bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              48-hour dispute window
            </p>
            <Badge tone="danger" glow>
              SLA
            </Badge>
          </div>
          <p className="tabular mt-2 font-display text-[34px] font-bold leading-none text-signal">
            {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
          </p>
          <p className="mt-1.5 text-2xs text-muted">Remaining time to contest before the challan is final.</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-edge">
            <motion.div
              className="h-full rounded-full bg-signal"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} />
            
          </div>
        </section>

        {/* Dispute banner */}
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 px-3.5 py-3">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-2xs leading-relaxed text-ink">
            <span className="font-bold">Fee applies only if your dispute is rejected.</span> Filing is free; a
            PKR 500 review fee is charged after the decision if the challan is upheld by human review.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            push('Dispute filed for human review', `${fine.id} queued to Punjab Traffic Police HQ.`, 'info');
            navigate('/wallet');
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98]">
          
          <GavelIcon className="h-4 w-4" aria-hidden="true" />
          File Dispute for Human Review
        </button>
        <button
          type="button"
          className="mt-2 w-full rounded-2xl border border-edge bg-surface px-4 py-3.5 text-sm font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink">
          
          Pay PKR {fine.amountPkr.toLocaleString()} now
        </button>
      </div>
    </div>);

}
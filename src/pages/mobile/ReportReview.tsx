import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeftIcon,
  EyeOffIcon,
  FingerprintIcon,
  LockIcon,
  PlayIcon,
  DownloadIcon,
  CarIcon,
  ScanLineIcon,
  MapPinIcon } from
'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import { media } from '../../data/media';

const aiRows = [
{ label: 'Detected plate', value: 'LEB-9931', Icon: ScanLineIcon, tone: 'telemetry' as const },
{ label: 'Vehicle match', value: 'Toyota Corolla · White', Icon: CarIcon, tone: 'telemetry' as const },
{ label: 'Location', value: 'Kalma Chowk, Lahore', Icon: MapPinIcon, tone: 'neutral' as const }];


export function ReportReview() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    setSubmitting(true);
    window.setTimeout(() => {
      push(
        'Locked & submitted to Police Vault',
        'Report RW-30219 sealed with SHA-256. Trust points pending review.',
        'success'
      );
      navigate('/wallet');
    }, 700);
  };

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-edge bg-canvas/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/capture')}
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink">
          
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to Live Camera
        </button>
        <Badge tone="accent">DRAFT</Badge>
      </header>

      <div className="px-4 pt-4">
        <h1 className="font-display text-xl font-bold text-ink">Review evidence</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Faces and bystander plates are blurred on-device before anything leaves your phone.
        </p>

        {/* Evidence player */}
        <figure className="mt-4 overflow-hidden rounded-2xl border border-edge bg-black">
          <div className="relative aspect-video">
            <img
              src={media.evidence}
              alt="Captured clip of a white sedan crossing the stop line"
              className="h-full w-full object-cover" />
            
            <div className="absolute inset-0 bg-canvas/20" />
            <button
              type="button"
              aria-label="Play 9 second evidence clip"
              className="absolute inset-0 flex items-center justify-center">
              
              <span className="glass flex h-14 w-14 items-center justify-center rounded-full shadow-glow-cyan">
                <PlayIcon className="ml-0.5 h-5 w-5 text-ink" aria-hidden="true" />
              </span>
            </button>

            {/* Privacy shield markers */}
            <div className="absolute left-[16%] top-[46%] h-9 w-14 rounded bg-white/10 backdrop-blur-md ring-1 ring-telemetry/50" />
            <div className="absolute left-[54%] top-[62%] h-8 w-20 rounded bg-white/10 backdrop-blur-md ring-1 ring-telemetry/50" />

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
              <Badge tone="telemetry" glow>
                <EyeOffIcon className="h-3 w-3" aria-hidden="true" />
                AUTO-BLUR SHIELD ON
              </Badge>
              <span className="tabular glass rounded-md px-2 py-1 text-[10px] font-semibold text-ink">
                00:09
              </span>
            </div>
          </div>

          <figcaption className="flex items-center justify-between gap-3 border-t border-edge bg-surface px-3.5 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <FingerprintIcon className="h-3 w-3 text-valid" aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  SHA-256 integrity hash
                </span>
              </div>
              <p className="tabular mt-1 truncate text-2xs text-ink">
                9f2c41a7e8b0d3...c71ab4e90f5d28
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-edge bg-canvas px-2 py-1.5 text-[10px] font-semibold text-muted">
              <DownloadIcon className="h-3 w-3" aria-hidden="true" />
              Export blocked
            </span>
          </figcaption>
        </figure>

        {/* AI data card */}
        <section className="mt-4 rounded-2xl border border-telemetry/25 bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">AI analysis</h2>
            <Badge tone="telemetry">96% confidence</Badge>
          </div>

          <dl className="mt-3.5 space-y-3">
            {aiRows.map(({ label, value, Icon, tone }) =>
            <div key={label} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-xs text-muted">
                  <Icon
                  className={`h-3.5 w-3.5 ${tone === 'telemetry' ? 'text-telemetry' : 'text-muted'}`}
                  aria-hidden="true" />
                
                  {label}
                </dt>
                <dd className="tabular font-display text-sm font-bold text-ink">{value}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 rounded-xl border border-signal/30 bg-signal/10 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-signal">Violation label</p>
            <p className="mt-0.5 font-display text-sm font-bold text-ink">
              Red light violation · §116 PMVO
            </p>
          </div>
        </section>

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-70">
          
          <LockIcon className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Sealing evidence…' : 'Lock & Submit to Police Vault'}
        </button>
        <p className="mt-2.5 text-center text-2xs text-muted">
          Once locked, the clip is read-only and cannot be edited or deleted.
        </p>
      </div>
    </div>);

}
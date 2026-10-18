import React, { useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  MaximizeIcon,
  CheckIcon,
  XIcon,
  ShieldAlertIcon,
  CircleCheckIcon,
  CircleAlertIcon,
  FingerprintIcon,
  MapPinIcon,
  ClockIcon } from
'lucide-react';
import { Badge } from '../ui/Badge';
import { Waveform } from '../ui/Waveform';
import { queueCases } from '../../data/queue';
import { media } from '../../data/media';
import { useToast } from '../../contexts/ToastContext';
import type { QueueCase } from '../../types/roadwatch';

const excise: Record<string, {type: string;plate: string;color: string;mismatch: boolean;}> = {
  default: { type: 'Sedan — Toyota Corolla', plate: 'Match', color: 'White', mismatch: false }
};

function MatchRow({
  label,
  frame,
  record,
  mismatch





}: {label: string;frame: string;record: string;mismatch: boolean;}) {
  return (
    <tr className="border-b border-edge last:border-0">
      <th scope="row" className="py-3 pr-3 text-left text-xs font-medium text-muted">
        {label}
      </th>
      <td className="py-3 pr-3 text-xs font-semibold text-ink">{frame}</td>
      <td className="py-3 pr-3 text-xs font-semibold text-ink">{record}</td>
      <td className="py-3 text-right">
        {mismatch ?
        <span className="inline-flex items-center gap-1 text-2xs font-bold text-signal">
            <CircleAlertIcon className="h-3.5 w-3.5" aria-hidden="true" />
            MISMATCH
          </span> :

        <span className="inline-flex items-center gap-1 text-2xs font-bold text-valid">
            <CircleCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
            MATCH
          </span>
        }
      </td>
    </tr>);

}

export function PendingQueueWorkspace() {
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState(queueCases[0].id);
  const [playing, setPlaying] = useState(true);
  const selected = queueCases.find((c) => c.id === selectedId) as QueueCase;
  const colorMismatch = selected.confidence < 80;

  const act = (label: string, tone: 'success' | 'danger' | 'info') => {
    push(`${label} — ${selected.id}`, `${selected.plate} · ${selected.violation}`, tone);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Queue list */}
      <div className="thin-scroll w-[300px] shrink-0 overflow-y-auto border-r border-edge">
        <div className="sticky top-0 flex items-center justify-between border-b border-edge bg-canvas px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Oldest first</p>
          <span className="tabular text-[10px] font-semibold text-muted">148 waiting</span>
        </div>
        <ul>
          {queueCases.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`w-full border-b border-edge/70 px-4 py-3 text-left transition-colors duration-150 ease-out ${
                  active ? 'bg-surface' : 'hover:bg-surface/50'}`
                  }>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular font-display text-sm font-bold text-ink">{c.plate}</span>
                    <span className="tabular text-[10px] text-muted">{c.submittedAt}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{c.violation}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge tone={c.confidence > 90 ? 'valid' : c.confidence > 75 ? 'telemetry' : 'danger'}>
                      AI {c.confidence}%
                    </Badge>
                    {c.flagged === 'fraud' && <Badge tone="danger">Fraud flag</Badge>}
                    {c.sirenDetected && <Badge tone="accent">Siren</Badge>}
                  </div>
                </button>
              </li>);

          })}
        </ul>
      </div>

      {/* Split pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto thin-scroll xl:flex-row">
          {/* Player */}
          <section className="flex min-w-0 flex-1 flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">
                  {selected.violation}
                  <span className="tabular ml-2 text-sm font-semibold text-muted">{selected.id}</span>
                </h2>
                <div className="mt-1 flex items-center gap-3 text-2xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" aria-hidden="true" />
                    {selected.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" aria-hidden="true" />
                    Submitted {selected.submittedAt}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FingerprintIcon className="h-3 w-3 text-valid" aria-hidden="true" />
                    Hash verified
                  </span>
                </div>
              </div>
              <Badge tone="accent" glow>
                AWAITING DECISION
              </Badge>
            </div>

            <figure className="overflow-hidden rounded-xl border border-edge bg-black">
              <div className="relative aspect-video">
                <img
                  src={media.commandframe}
                  alt={`Evidence video frame for case ${selected.id}`}
                  className="h-full w-full object-cover" />
                
                <span className="tabular absolute left-3 top-3 rounded bg-canvas/80 px-2 py-1 text-[10px] font-bold text-ink">
                  CAM 01 · 1080p60 · 17 SEP 2026 19:42:08
                </span>
                <div className="absolute left-[46%] top-[56%] h-10 w-24 rounded border border-telemetry shadow-glow-cyan" />
                <span className="absolute left-[46%] top-[52%] rounded bg-telemetry px-1.5 text-[9px] font-bold text-canvas">
                  {selected.plate}
                </span>
              </div>

              <div className="border-t border-edge bg-surface p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? 'Pause clip' : 'Play clip'}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-canvas transition-transform duration-150 ease-out active:scale-95">
                    
                    {playing ?
                    <PauseIcon className="h-4 w-4" aria-hidden="true" /> :

                    <PlayIcon className="ml-0.5 h-4 w-4" aria-hidden="true" />
                    }
                  </button>
                  <span className="tabular text-xs font-semibold text-ink">00:06 / 00:13</span>
                  <div className="ml-auto flex items-center gap-2 text-muted">
                    <Volume2Icon className="h-4 w-4" aria-hidden="true" />
                    <MaximizeIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Audio — siren detector
                    </p>
                    {selected.sirenDetected ?
                    <Badge tone="danger" glow>
                        Emergency siren detected
                      </Badge> :

                    <Badge tone="valid">No siren in clip</Badge>
                    }
                  </div>
                  <Waveform sirenDetected={selected.sirenDetected} />
                  {selected.sirenDetected &&
                  <p className="mt-2 text-2xs leading-snug text-muted">
                      A siren overlaps the violation window — the vehicle may have been yielding to an
                      emergency vehicle. Review before issuing a challan.
                    </p>
                  }
                </div>
              </div>
            </figure>
          </section>

          {/* Match engine */}
          <section className="w-full shrink-0 border-t border-edge p-6 xl:w-[420px] xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink">Match Engine</h3>
              <Badge tone="telemetry" glow>
                Excise sync live
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <figure className="overflow-hidden rounded-lg border border-telemetry/40">
                <img
                  src={media.commandframe}
                  alt="Cropped live video frame of the reported vehicle"
                  className="h-24 w-full object-cover" />
                
                <figcaption className="bg-surface px-2 py-1.5 text-[10px] font-semibold text-telemetry">
                  Live video frame
                </figcaption>
              </figure>
              <figure className="overflow-hidden rounded-lg border border-edge">
                <img
                  src={media.evidence}
                  alt="Excise registry photo on record"
                  className="h-24 w-full object-cover opacity-80" />
                
                <figcaption className="bg-surface px-2 py-1.5 text-[10px] font-semibold text-muted">
                  Excise record photo
                </figcaption>
              </figure>
            </div>

            <table className="mt-4 w-full">
              <caption className="sr-only">Video frame compared against the Excise vehicle record</caption>
              <thead>
                <tr className="border-b border-edge">
                  <th scope="col" className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                    Field
                  </th>
                  <th scope="col" className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-telemetry">
                    Frame
                  </th>
                  <th scope="col" className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                    Excise
                  </th>
                  <th scope="col" className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                <MatchRow label="Plate ID" frame={selected.plate} record={selected.plate} mismatch={false} />
                <MatchRow
                  label="Vehicle type"
                  frame={excise.default.type}
                  record={excise.default.type}
                  mismatch={false} />
                
                <MatchRow
                  label="Colour"
                  frame={colorMismatch ? 'Black' : 'White'}
                  record="White"
                  mismatch={colorMismatch} />
                
                <MatchRow label="Registration status" frame="—" record="Active · tax paid" mismatch={false} />
              </tbody>
            </table>

            <div className="mt-4 rounded-xl border border-edge bg-surface p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Reporter</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">{selected.reporter}</p>
                <Badge tone={selected.reporterTrust > 85 ? 'valid' : 'accent'}>
                  Trust {selected.reporterTrust}
                </Badge>
              </div>
              <p className="mt-1.5 text-2xs text-muted">
                31 approved · 2 rejected · no fraud history on record
              </p>
            </div>

            {colorMismatch &&
            <p className="mt-3 rounded-xl border border-signal/30 bg-signal/10 px-3 py-2.5 text-2xs leading-snug text-ink">
                Colour mismatch against the Excise record. Escalate rather than approve — this pattern matches
                known plate-cloning cases.
              </p>
            }
          </section>
        </div>

        {/* Action control bar */}
        <div className="flex shrink-0 items-center gap-3 border-t border-edge bg-surface px-6 py-4">
          <button
            type="button"
            onClick={() => act('Challan approved', 'success')}
            className="inline-flex items-center gap-2 rounded-xl bg-valid px-4 py-3 font-display text-[13px] font-bold text-canvas shadow-glow-green transition-transform duration-150 ease-out active:scale-[0.98]">
            
            <CheckIcon className="h-4 w-4" aria-hidden="true" />
            Approve Challan
          </button>
          <button
            type="button"
            onClick={() => act('Rejected & reporter fined', 'danger')}
            className="inline-flex items-center gap-2 rounded-xl border border-signal/50 bg-signal/10 px-4 py-3 font-display text-[13px] font-bold text-signal transition-colors duration-150 ease-out hover:bg-signal/20">
            
            <XIcon className="h-4 w-4" aria-hidden="true" />
            Reject &amp; Fine Reporter
          </button>
          <button
            type="button"
            onClick={() => act('Escalated to Excise Fraud Unit', 'info')}
            className="inline-flex items-center gap-2 rounded-xl border border-edge bg-canvas px-4 py-3 font-display text-[13px] font-bold text-muted transition-colors duration-150 ease-out hover:text-ink">
            
            <ShieldAlertIcon className="h-4 w-4" aria-hidden="true" />
            Escalate to Excise Fraud Unit
          </button>
          <p className="ml-auto text-2xs text-muted">
            Decision is logged against PTP-3042 and sent to the citizen via 8070.
          </p>
        </div>
      </div>
    </div>);

}
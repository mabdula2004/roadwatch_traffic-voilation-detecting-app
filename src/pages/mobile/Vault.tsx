import React, { useState } from 'react';
import { CloudUploadIcon, CheckCircle2Icon, HardDriveIcon, RefreshCwIcon, VideoIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { pendingUploads } from '../../data/queue';
import type { PendingUpload } from '../../types/roadwatch';
import { useScreenInit } from '../../useScreenInit.js';

const stateMeta: Record<
  PendingUpload['state'],
  {label: string;color: string;tone: 'telemetry' | 'valid' | 'neutral' | 'danger';}> =
{
  uploading: { label: 'Uploading', color: '#38BDF8', tone: 'telemetry' },
  encrypting: { label: 'Encrypting', color: '#10B981', tone: 'valid' },
  queued: { label: 'Queued', color: '#94A3B8', tone: 'neutral' },
  failed: { label: 'Retry needed', color: '#EF4444', tone: 'danger' }
};

const sealedReports = [
{ id: 'RW-30219', label: 'Red light violation · LEB-9931', location: 'Kalma Chowk, Lahore', state: 'Under police review' },
{ id: 'RW-30118', label: 'Wrong way · AJK-0071', location: 'Murree Rd, Rawalpindi', state: 'Challan issued' },
{ id: 'RW-29904', label: 'No helmet · LEC-6688', location: 'Ravi Rd, Lahore', state: 'Rejected — no fine' }];


const tabs = ['Pending uploads', 'Sealed reports'] as const;

export function Vault() {
  const screenInit = useScreenInit();
  const [tab, setTab] = useState<(typeof tabs)[number]>(screenInit.vaultTab ?? 'Pending uploads');

  return (
    <div className="min-h-full px-4 pb-28 pt-5">
      <h1 className="font-display text-xl font-bold text-ink">Evidence Vault</h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
        { label: 'Pending', value: String(pendingUploads.length), Icon: CloudUploadIcon, color: 'text-telemetry' },
        { label: 'Sealed', value: '37', Icon: CheckCircle2Icon, color: 'text-valid' },
        { label: 'On device', value: '216 MB', Icon: HardDriveIcon, color: 'text-muted' }].
        map(({ label, value, Icon, color }) =>
        <div key={label} className="rounded-xl border border-edge bg-surface px-3 py-2.5">
            <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
            <p className="tabular mt-1.5 font-display text-base font-bold text-ink">{value}</p>
            <p className="text-[10px] text-muted">{label}</p>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Vault sections" className="mt-5 flex gap-1 rounded-xl border border-edge bg-surface p-1">
        {tabs.map((t) =>
        <button
          key={t}
          role="tab"
          aria-selected={tab === t}
          onClick={() => setTab(t)}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-150 ease-out ${
          tab === t ? 'bg-canvas text-telemetry shadow-glow-cyan' : 'text-muted'}`
          }>
          
            {t}
          </button>
        )}
      </div>

      {tab === 'Pending uploads' ?
      <ul className="mt-4 space-y-2.5">
          {pendingUploads.map((u) => {
          const meta = stateMeta[u.state];
          return (
            <li key={u.id} className="rounded-2xl border border-edge bg-surface p-3.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-edge bg-canvas text-muted">
                    <VideoIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{u.label}</p>
                    <p className="tabular mt-0.5 text-2xs text-muted">
                      {u.capturedAt} · {u.sizeMb.toFixed(1)} MB
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={u.progress} color={meta.color} label={`${u.label} upload progress`} />
                  <span className="tabular w-9 shrink-0 text-right text-2xs font-semibold text-muted">
                    {u.progress}%
                  </span>
                </div>

                {u.state === 'failed' &&
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-signal/40 bg-signal/10 px-2.5 py-1.5 text-2xs font-semibold text-signal transition-colors duration-150 ease-out hover:bg-signal/20">
                
                    <RefreshCwIcon className="h-3 w-3" aria-hidden="true" />
                    Retry upload
                  </button>
              }
              </li>);

        })}
        </ul> :

      <ul className="mt-4 space-y-2.5">
          {sealedReports.map((r) =>
        <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-edge bg-surface p-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-edge bg-canvas text-valid">
                <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">{r.label}</p>
                <p className="tabular mt-0.5 text-2xs text-muted">
                  {r.id} · {r.location}
                </p>
              </div>
              <Badge
            tone={r.state === 'Challan issued' ? 'valid' : r.state.startsWith('Rejected') ? 'danger' : 'accent'}>
            
                {r.state}
              </Badge>
            </li>
        )}
        </ul>
      }
    </div>);

}
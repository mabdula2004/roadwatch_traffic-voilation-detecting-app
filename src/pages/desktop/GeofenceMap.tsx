import React, { useState } from 'react';
import { BanIcon, CheckCircle2Icon, LayersIcon } from 'lucide-react';
import { PortalHeader } from '../../components/desktop/PortalHeader';
import { Badge } from '../../components/ui/Badge';

interface Zone {
  id: string;
  name: string;
  kind: 'enabled' | 'disabled';
  reports: string;
  note: string;
}

const zones: Zone[] = [
{
  id: 'Z-01',
  name: 'Ring Road Corridor',
  kind: 'enabled',
  reports: '412 / week',
  note: 'Full capture enabled. Highest speeding density in Lahore.'
},
{
  id: 'Z-02',
  name: 'Ferozepur Rd Arterial',
  kind: 'enabled',
  reports: '288 / week',
  note: 'Signal-jump hotspot at Kalma Chowk intersection.'
},
{
  id: 'Z-03',
  name: 'Canal Bank Expressway',
  kind: 'enabled',
  reports: '196 / week',
  note: 'Wrong-way and lane discipline reports prioritised.'
},
{
  id: 'Z-04',
  name: 'Model Town Residential',
  kind: 'disabled',
  reports: 'Capture blocked',
  note: 'Residential privacy zone — the app refuses to record here.'
},
{
  id: 'Z-05',
  name: 'Johar Town Blocks G–R',
  kind: 'disabled',
  reports: 'Capture blocked',
  note: 'Schools and homes. Only SOS recording is permitted.'
}];


export function GeofenceMap() {
  const [selected, setSelected] = useState<string>('Z-01');

  return (
    <div className="flex h-screen min-h-[720px] w-full flex-col overflow-hidden bg-canvas">
      <PortalHeader title="City GIS Geofencing" subtitle="Lahore Metropolitan · Punjab Traffic Police">
        <Badge tone="accent">3 zones enabled</Badge>
        <Badge tone="danger">2 zones blocked</Badge>
      </PortalHeader>

      <div className="flex min-h-0 flex-1">
        {/* Map */}
        <div className="scan-grid relative min-w-0 flex-1 bg-[#0B1220]">
          <svg viewBox="0 0 800 600" className="h-full w-full" role="img" aria-label="Geofenced zones over Lahore">
            {/* roads */}
            <g stroke="#1E293B" strokeWidth="14" fill="none">
              <path d="M0 470 C 180 430, 300 520, 480 460 S 700 380, 800 420" />
              <path d="M120 0 L 180 600" />
              <path d="M520 0 L 460 600" />
              <path d="M0 200 L 800 240" />
            </g>
            <g stroke="#334155" strokeWidth="2" fill="none" strokeDasharray="8 10">
              <path d="M0 470 C 180 430, 300 520, 480 460 S 700 380, 800 420" />
              <path d="M0 200 L 800 240" />
            </g>

            {/* enabled corridors */}
            <g fill="none" stroke="#F59E0B" strokeWidth="9" strokeLinecap="round" opacity="0.85">
              <path
                d="M0 470 C 180 430, 300 520, 480 460 S 700 380, 800 420"
                style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.7))' }}
                opacity={selected === 'Z-01' ? 1 : 0.55} />
              
              <path
                d="M120 0 L 180 600"
                style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.55))' }}
                opacity={selected === 'Z-02' ? 1 : 0.4} />
              
              <path
                d="M0 200 L 800 240"
                style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.55))' }}
                opacity={selected === 'Z-03' ? 1 : 0.4} />
              
            </g>

            {/* disabled residential polygons */}
            <g>
              <polygon
                points="540,300 720,290 740,430 560,450"
                fill="rgba(239,68,68,0.14)"
                stroke="#EF4444"
                strokeWidth={selected === 'Z-04' ? 3 : 1.5}
                strokeDasharray="6 6" />
              
              <polygon
                points="230,80 400,70 420,190 250,205"
                fill="rgba(239,68,68,0.14)"
                stroke="#EF4444"
                strokeWidth={selected === 'Z-05' ? 3 : 1.5}
                strokeDasharray="6 6" />
              
              <text x="565" y="370" fill="#EF4444" fontSize="13" fontWeight="700">
                MODEL TOWN — NO CAPTURE
              </text>
              <text x="252" y="140" fill="#EF4444" fontSize="13" fontWeight="700">
                JOHAR TOWN — NO CAPTURE
              </text>
            </g>

            {/* live report pins */}
            <g>
              {[
              [300, 492],
              [470, 462],
              [640, 424],
              [160, 320],
              [520, 520],
              [96, 470]].
              map(([cx, cy]) =>
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r="5"
                fill="#38BDF8"
                style={{ filter: 'drop-shadow(0 0 6px #38BDF8)' }} />

              )}
            </g>
          </svg>

          <div className="glass absolute bottom-5 left-5 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5">
              <LayersIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Legend</p>
            </div>
            <ul className="mt-2 space-y-1.5 text-2xs text-ink">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-6 rounded-full bg-accent" />
                Capture-enabled highway corridor
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-6 rounded border border-dashed border-signal bg-signal/20" />
                Residential zone — capture disabled
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-telemetry" />
                Report received in last hour
              </li>
            </ul>
          </div>
        </div>

        {/* Zone list */}
        <aside className="thin-scroll w-[360px] shrink-0 overflow-y-auto border-l border-edge p-5">
          <h2 className="font-display text-sm font-bold text-ink">Zone rules</h2>
          <p className="mt-1 text-2xs leading-relaxed text-muted">
            Geofences decide where the citizen app is allowed to record at all. Changes take effect on the next
            app sync.
          </p>

          <ul className="mt-4 space-y-2">
            {zones.map((z) => {
              const active = z.id === selected;
              return (
                <li key={z.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(z.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full rounded-xl border bg-surface p-3.5 text-left transition-colors duration-150 ease-out ${
                    active ?
                    z.kind === 'enabled' ?
                    'border-accent/60' :
                    'border-signal/60' :
                    'border-edge hover:border-edge/60'}`
                    }>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">{z.name}</p>
                      {z.kind === 'enabled' ?
                      <Badge tone="accent">
                          <CheckCircle2Icon className="h-3 w-3" aria-hidden="true" />
                          Enabled
                        </Badge> :

                      <Badge tone="danger">
                          <BanIcon className="h-3 w-3" aria-hidden="true" />
                          Blocked
                        </Badge>
                      }
                    </div>
                    <p className="tabular mt-1.5 text-2xs font-semibold text-muted">{z.reports}</p>
                    <p className="mt-1.5 text-2xs leading-snug text-muted">{z.note}</p>
                  </button>
                </li>);

            })}
          </ul>
        </aside>
      </div>
    </div>);

}
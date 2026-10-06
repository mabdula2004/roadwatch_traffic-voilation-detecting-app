import React from 'react';
import { TrendingDownIcon, TrendingUpIcon, MinusIcon, TruckIcon, AlertTriangleIcon } from 'lucide-react';
import { PortalHeader } from '../../components/desktop/PortalHeader';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { fleetDrivers } from '../../data/queue';

const trendIcon = {
  up: { Icon: TrendingUpIcon, className: 'text-signal', label: 'Worsening' },
  down: { Icon: TrendingDownIcon, className: 'text-valid', label: 'Improving' },
  flat: { Icon: MinusIcon, className: 'text-muted', label: 'Flat' }
};

export function FleetManager() {
  const worst = fleetDrivers[0];

  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <PortalHeader title="Fleet Safety Console" subtitle="Indus Logistics (Pvt) Ltd · 68 vehicles">
        <Badge tone="telemetry" glow>
          <TruckIcon className="h-3 w-3" aria-hidden="true" />
          RoadWatch B2B
        </Badge>
      </PortalHeader>

      <div className="thin-scroll flex-1 overflow-y-auto p-6">
        {/* Primary panel: highest-risk driver */}
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-signal/40 bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Highest risk driver this month
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-bold text-ink">{worst.name}</h2>
                <p className="tabular mt-1 text-xs text-muted">
                  {worst.vehicle} · {worst.id}
                </p>
              </div>
              <Badge tone="danger" glow>
                <AlertTriangleIcon className="h-3 w-3" aria-hidden="true" />
                Suspension review
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
              { label: 'Violations', value: worst.violations, sub: '4 in last 7 days' },
              { label: 'Safety score', value: worst.score, sub: 'Fleet average 74' },
              { label: 'Fines owed', value: 'PKR 14,500', sub: 'Billed to fleet account' }].
              map((k) =>
              <div key={k.label} className="rounded-xl border border-edge bg-canvas px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted">{k.label}</p>
                  <p className="tabular mt-1 font-display text-xl font-bold text-ink">{k.value}</p>
                  <p className="mt-1 text-2xs text-muted">{k.sub}</p>
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Safety score vs fleet threshold (60)
                </p>
                <span className="tabular text-2xs font-bold text-signal">{worst.score} / 100</span>
              </div>
              <ProgressBar value={worst.score} color="#EF4444" label="Driver safety score" />
            </div>
          </div>

          <div className="grid gap-4">
            {[
            { label: 'Fleet violations (30d)', value: '22', tone: 'text-signal', sub: '−8% vs last month' },
            { label: 'Citizen reports received', value: '41', tone: 'text-telemetry', sub: '19 upheld' },
            { label: 'Fines paid', value: 'PKR 63,000', tone: 'text-accent', sub: 'Auto-debited from e-Pay' }].
            map((k) =>
            <div key={k.label} className="rounded-2xl border border-edge bg-surface px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{k.label}</p>
                <p className={`tabular mt-1.5 font-display text-2xl font-bold ${k.tone}`}>{k.value}</p>
                <p className="mt-1 text-2xs text-muted">{k.sub}</p>
              </div>
            )}
          </div>
        </section>

        {/* Leaderboard */}
        <h2 className="mt-8 font-display text-sm font-bold text-ink">Driver violation leaderboard</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-edge">
          <table className="w-full">
            <caption className="sr-only">Drivers ranked by violations in the last 30 days</caption>
            <thead className="bg-surface">
              <tr>
                {['#', 'Driver', 'Vehicle', 'Violations (30d)', 'Safety score', 'Trend', 'Status'].map((h) =>
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                  
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {fleetDrivers.map((d, i) => {
                const { Icon, className, label } = trendIcon[d.trend];
                return (
                  <tr
                    key={d.id}
                    className="border-t border-edge transition-colors duration-150 ease-out hover:bg-surface/60">
                    
                    <td className="tabular px-4 py-3 text-xs font-bold text-muted">{i + 1}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink">{d.name}</td>
                    <td className="tabular px-4 py-3 text-xs text-muted">{d.vehicle}</td>
                    <td className="tabular px-4 py-3 text-xs font-bold text-ink">{d.violations}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="tabular w-7 text-xs font-bold text-ink">{d.score}</span>
                        <ProgressBar
                          value={d.score}
                          color={d.score >= 80 ? '#10B981' : d.score >= 60 ? '#F59E0B' : '#EF4444'}
                          className="w-28"
                          label={`${d.name} safety score`} />
                        
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-2xs font-semibold ${className}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.score < 60 ?
                      <Badge tone="danger">Grounded</Badge> :
                      d.score < 80 ?
                      <Badge tone="accent">Coaching</Badge> :

                      <Badge tone="valid">Cleared</Badge>
                      }
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}
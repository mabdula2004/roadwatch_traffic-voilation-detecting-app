import React from 'react';
import { Badge } from './ui/Badge';
import { Eye, Clock } from 'lucide-react';

export function CaseListWorkspace({
  title,
  description,
  cases,
  tone = 'neutral',
  emptyMessage = 'No records found in this category.',
  onSelectCase,
}) {
  return (
    <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-edge pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        <div className="rounded-xl border border-edge bg-surface px-4 py-1.5 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Cases</p>
          <p className="tabular font-display text-xl font-bold text-ink">{cases.length}</p>
        </div>
      </div>

      {/* Table */}
      {cases.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-center text-muted">
          <div>
            <Clock className="mx-auto h-8 w-8 text-muted/40" />
            <p className="mt-2 text-xs">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-edge bg-surface/50">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge bg-surface text-[10px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">License Plate</th>
                <th className="px-4 py-3">Violation</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
                {onSelectCase && <th className="px-4 py-3 text-right">Inspect</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60 text-ink">
              {cases.map((c) => (
                <tr key={c.reportId} className="transition hover:bg-surface/80">
                  <td className="px-4 py-3 font-semibold text-muted">{c.caseId}</td>
                  <td className="px-4 py-3 font-display font-bold text-ink">
                    {c.citizenPlate || (c.rawPlate ? c.rawPlate : (
                      <span className="text-2xs font-normal text-muted">Unidentified</span>
                    ))}
                  </td>
                  <td className="px-4 py-3 font-medium text-accent">{c.violationName}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.reporterName}
                    <span className="ml-1 text-2xs text-valid">({c.reporterTrust}%)</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.locationName || 'Lahore'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        c.status === 'accepted'
                          ? 'valid'
                          : c.status === 'rejected'
                          ? 'danger'
                          : c.isDisputed
                          ? 'accent'
                          : 'telemetry'
                      }
                    >
                      {c.status === 'accepted'
                        ? 'Confirmed'
                        : c.status === 'rejected'
                        ? 'Dismissed'
                        : c.isDisputed
                        ? 'Disputed'
                        : 'Under Review'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-2xs text-muted">{c.submittedAt}</td>
                  {onSelectCase && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectCase(c)}
                        className="inline-flex items-center gap-1 rounded border border-edge bg-canvas/60 px-2 py-1 text-2xs font-semibold text-telemetry hover:border-telemetry"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

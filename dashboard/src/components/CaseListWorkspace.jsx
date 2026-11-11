import React, { useState, useMemo } from 'react';
import { Badge } from './ui/Badge';
import { Eye, Clock, UserCheck, Users } from 'lucide-react';

export function CaseListWorkspace({
  title,
  description,
  cases = [],
  tone = 'neutral',
  emptyMessage = 'No records found in this category.',
  onSelectCase,
  currentUser,
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'my'

  // Filter cases audited specifically by current officer
  const myCases = useMemo(() => {
    if (!currentUser?.badge) return [];
    return cases.filter((c) => c.auditedByBadge === currentUser.badge);
  }, [cases, currentUser?.badge]);

  const displayedCases = filterMode === 'my' ? myCases : cases;

  return (
    <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-edge pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Toggle between All Division Cases vs My Audited Decisions */}
          {currentUser && (
            <div className="flex items-center rounded-xl border border-edge bg-surface p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('my')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  filterMode === 'my'
                    ? 'bg-telemetry text-black font-bold shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>My Decisions ({myCases.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  filterMode === 'all'
                    ? 'bg-telemetry text-black font-bold shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>All Division ({cases.length})</span>
              </button>
            </div>
          )}

          <div className="rounded-xl border border-edge bg-surface px-4 py-1.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Showing</p>
            <p className="tabular font-display text-xl font-bold text-ink">
              {displayedCases.length}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {displayedCases.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-center text-muted">
          <div>
            <Clock className="mx-auto h-8 w-8 text-muted/40" />
            <p className="mt-2 text-xs">
              {filterMode === 'my'
                ? `You have not audited any cases in this category yet. Switch to "All Division" to view all records.`
                : emptyMessage}
            </p>
            {filterMode === 'my' && (
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-semibold text-telemetry hover:border-telemetry"
              >
                View All Division Records ({cases.length})
              </button>
            )}
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
                <th className="px-4 py-3">Auditing Officer</th>
                <th className="px-4 py-3">Timestamp</th>
                {onSelectCase && <th className="px-4 py-3 text-right">Inspect</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60 text-ink">
              {displayedCases.map((c) => {
                const isAuditedByMe = c.auditedByBadge && currentUser?.badge && c.auditedByBadge === currentUser.badge;

                return (
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
                    <td className="px-4 py-3">
                      {isAuditedByMe ? (
                        <span className="inline-flex items-center gap-1 rounded bg-valid/20 border border-valid/40 px-2 py-0.5 text-2xs font-bold text-valid">
                          You ({currentUser.badge})
                        </span>
                      ) : c.auditedByBadge ? (
                        <span className="inline-flex items-center gap-1 rounded bg-canvas border border-edge px-2 py-0.5 text-2xs font-medium text-ink">
                          Officer {c.auditedByName || c.auditedByBadge}
                        </span>
                      ) : (
                        <span className="text-2xs text-muted">Central Desk</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

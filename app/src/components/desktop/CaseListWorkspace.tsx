import React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { QueueCase } from '../../types/roadwatch';

interface CaseListWorkspaceProps {
  title: string;
  description: string;
  cases: QueueCase[];
  accent: 'telemetry' | 'danger' | 'valid';
  actionLabel: string;
}

const accentText = {
  telemetry: 'text-telemetry',
  danger: 'text-signal',
  valid: 'text-valid'
};

export function CaseListWorkspace({
  title,
  description,
  cases,
  accent,
  actionLabel
}: CaseListWorkspaceProps) {
  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{description}</p>
        </div>
        <p className={`tabular font-display text-3xl font-bold ${accentText[accent]}`}>{cases.length}</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-edge">
        <table className="w-full">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-surface">
            <tr>
              {['Case', 'Plate', 'Violation', 'Reporter', 'AI confidence', 'Age', ''].map((h) =>
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
            {cases.map((c) =>
            <tr
              key={c.id}
              className="border-t border-edge transition-colors duration-150 ease-out hover:bg-surface/60">
              
                <td className="tabular px-4 py-3 text-xs font-semibold text-ink">{c.id}</td>
                <td className="tabular px-4 py-3 font-display text-sm font-bold text-ink">{c.plate}</td>
                <td className="px-4 py-3 text-xs text-muted">{c.violation}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {c.reporter}
                  <span className="tabular ml-1.5 text-[10px] text-muted/70">· {c.reporterTrust}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={c.confidence > 80 ? 'valid' : c.confidence > 60 ? 'accent' : 'danger'}>
                    {c.confidence}%
                  </Badge>
                </td>
                <td className="tabular px-4 py-3 text-xs text-muted">{c.submittedAt}</td>
                <td className="px-4 py-3 text-right">
                  <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 text-2xs font-bold ${accentText[accent]} transition-opacity duration-150 ease-out hover:opacity-80`}>
                  
                    {actionLabel}
                    <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}
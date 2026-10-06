import React from 'react';
import { Badge } from '../ui/Badge';

const reporters = [
{ cnic: '35202-4417896-8', name: 'Ahmed Raza Khan', city: 'Lahore', reports: 33, approved: 31, trust: 94 },
{ cnic: '35201-9982104-3', name: 'Sana Iqbal', city: 'Lahore', reports: 61, approved: 59, trust: 97 },
{ cnic: '37405-1120397-1', name: 'Bilal Ahmed', city: 'Rawalpindi', reports: 18, approved: 12, trust: 71 },
{ cnic: '33100-7741902-5', name: 'Usman Shah', city: 'Faisalabad', reports: 24, approved: 11, trust: 62 },
{ cnic: '35202-3390118-9', name: 'Danish Gill', city: 'Lahore', reports: 9, approved: 2, trust: 44 }];


export function ReporterRegistryWorkspace() {
  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-6">
      <h2 className="font-display text-lg font-bold text-ink">Reporter Registry</h2>
      <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
        Every submission is CNIC-bound. Trust below 50 routes all future reports through community validation
        first.
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-edge">
        <table className="w-full">
          <caption className="sr-only">Registered citizen reporters</caption>
          <thead className="bg-surface">
            <tr>
              {['Reporter', 'CNIC', 'City', 'Reports', 'Approved', 'Trust', 'Standing'].map((h) =>
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
            {reporters.map((r) =>
            <tr key={r.cnic} className="border-t border-edge transition-colors duration-150 ease-out hover:bg-surface/60">
                <td className="px-4 py-3 text-xs font-semibold text-ink">{r.name}</td>
                <td className="tabular px-4 py-3 text-xs text-muted">{r.cnic}</td>
                <td className="px-4 py-3 text-xs text-muted">{r.city}</td>
                <td className="tabular px-4 py-3 text-xs text-ink">{r.reports}</td>
                <td className="tabular px-4 py-3 text-xs text-ink">{r.approved}</td>
                <td className="tabular px-4 py-3 font-display text-sm font-bold text-ink">{r.trust}</td>
                <td className="px-4 py-3">
                  {r.trust >= 85 ?
                <Badge tone="valid">Priority lane</Badge> :
                r.trust >= 60 ?
                <Badge tone="accent">Standard review</Badge> :

                <Badge tone="danger">Restricted</Badge>
                }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}
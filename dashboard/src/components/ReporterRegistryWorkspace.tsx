import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Badge } from './ui/Badge';
import { Users, ShieldCheck, RefreshCw } from 'lucide-react';

interface ReporterUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  account_state: string;
  created_at?: string;
  trust_score?: number;
  vehicle_plate?: string;
}

export function ReporterRegistryWorkspace() {
  const [reporters, setReporters] = useState<ReporterUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReporters = async () => {
    setLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('base_users')
        .select(`
          user_id,
          name,
          email,
          role,
          account_state,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch reporters error:', error);
      }

      // Fetch profiles to join trust score
      const { data: profiles } = await supabase
        .from('reporter_profiles')
        .select('reporter_id, trust_score, vehicle_plate');

      const profileMap = new Map(profiles?.map((p) => [p.reporter_id, p]) || []);

      const merged = (users || []).map((u) => {
        const prof = profileMap.get(u.user_id);
        return {
          ...u,
          trust_score: prof?.trust_score ?? 100,
          vehicle_plate: prof?.vehicle_plate ?? 'LEA-4471',
        };
      });

      setReporters(merged);
    } catch (e) {
      console.error('Failed to load reporters:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporters();
  }, []);

  return (
    <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="flex items-end justify-between border-b border-edge pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Registered Citizen Reporters</h2>
          <p className="mt-1 text-xs text-muted">
            All reports are legally bound to citizen CNIC and verified phone accounts via SEC 15 evidentiary protocol.
          </p>
        </div>
        <button
          onClick={fetchReporters}
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs text-muted hover:border-telemetry hover:text-telemetry"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-edge bg-surface/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-edge bg-surface text-[10px] font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Citizen Name</th>
              <th className="px-4 py-3">Contact Email</th>
              <th className="px-4 py-3">Registered Vehicle Plate</th>
              <th className="px-4 py-3">Account State</th>
              <th className="px-4 py-3">Trust Score</th>
              <th className="px-4 py-3">Evidentiary Standing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60 text-ink">
            {reporters.map((r) => {
              const trust = r.trust_score ?? 100;
              return (
                <tr key={r.user_id} className="transition hover:bg-surface/80">
                  <td className="px-4 py-3 font-semibold text-ink">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-valid" />
                      <span>{r.name || 'Citizen Reporter'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{r.email || 'N/A'}</td>
                  <td className="px-4 py-3 font-display font-bold text-telemetry">
                    {r.vehicle_plate || 'LEA-4471'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.account_state === 'active' ? 'valid' : 'accent'}>
                      {r.account_state || 'Active'}
                    </Badge>
                  </td>
                  <td className="tabular px-4 py-3 font-display font-bold text-valid">
                    {trust}%
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={trust >= 85 ? 'valid' : trust >= 60 ? 'accent' : 'danger'}>
                      {trust >= 85 ? 'Priority Lane' : trust >= 60 ? 'Standard Review' : 'Restricted'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

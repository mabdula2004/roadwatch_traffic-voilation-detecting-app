import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { PortalHeader } from './components/PortalHeader';
import { CommandSidebar } from './components/CommandSidebar';
import { PendingQueueWorkspace } from './components/PendingQueueWorkspace';
import { CaseListWorkspace } from './components/CaseListWorkspace';
import { ReporterRegistryWorkspace } from './components/ReporterRegistryWorkspace';

const VIOLATION_MAP = {
  red_light_running: { name: 'Red Light Violation (Signal Jump)', fine: 2000 },
  helmet_violation: { name: 'No Safety Helmet (Rider / Pillion)', fine: 1000 },
  wrong_way_driving: { name: 'One-Way Violation / Wrong-Way Driving', fine: 2000 },
  triple_riding: { name: 'Pillion / Triple Riding Infraction', fine: 1000 },
  illegal_u_turn: { name: 'Prohibited U-Turn / Dangerous Maneuver', fine: 1500 },
  phone_use_while_driving: { name: 'Distracted Driving (Mobile Phone in Hand)', fine: 2000 },
  seatbelt_violation: { name: 'Driver / Passenger Seatbelt Violation', fine: 1500 },
  speeding_reckless: { name: 'Excessive Speed / Reckless Maneuvering', fine: 2500 },
  emergency_obstruction: { name: 'Obstructing Emergency Ambulance / Police', fine: 5000 },
  lane_violation: { name: 'Restricted Lane / Line Straddling', fine: 1000 },
  unspecified_violation: { name: 'Unspecified Infraction (Pending Officer Review)', fine: 2000 },
  pending_review: { name: 'Suspected Infraction (Officer Review Requested)', fine: 2000 },
  auto_ai_detect: { name: 'Suspected Infraction (Pending Officer ID)', fine: 2000 },
  traffic_violation: { name: 'General Traffic Infraction', fine: 2000 },
};

export function App() {
  const [activeTab, setActiveTab] = useState('Pending Queue');
  const [cases, setCases] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCases = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch reports from Supabase
      const { data: rawReports, error } = await supabase
        .from('reports')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.warn('Reports query notice:', error);
      }

      // 2. Fetch base users + reporter profiles to map reporter names & trust scores
      const { data: users } = await supabase
        .from('base_users')
        .select('user_id, name, email');
      const userMap = new Map((users || []).map((u) => [u.user_id, u.name || u.email]));

      const { data: profiles } = await supabase
        .from('reporter_profiles')
        .select('reporter_id, trust_score');
      const trustMap = new Map((profiles || []).map((p) => [p.reporter_id, p.trust_score ?? 100]));

      // 3. Map into clean queue items using real database data
      const mapped = (rawReports || []).map((r) => {
        const vInfo = VIOLATION_MAP[r.claimed_class] || {
          name: (r.claimed_class && r.claimed_class !== 'auto_ai_detect' && r.claimed_class !== 'unspecified_violation')
            ? r.claimed_class.replace(/_/g, ' ').toUpperCase()
            : 'Unspecified Infraction (Pending Officer Review)',
          fine: 2000,
        };

        const isDisputed = r.status === 'pending_manual_review' || r.status === 'under_review';
        const dateObj = new Date(r.uploaded_at || r.captured_at || Date.now());
        const timeAgo = formatTimeAgo(dateObj);

        // Frame public URLs if stored in Supabase Storage evidence_vault
        let frameUris = [];
        if (Array.isArray(r.frame_uris) && r.frame_uris.length > 0) {
          frameUris = r.frame_uris;
        } else if (r.client_capture_id) {
          const { data: url1 } = supabase.storage
            .from('evidence_vault')
            .getPublicUrl(`${r.client_capture_id}/frame_1.jpg`);
          const { data: url2 } = supabase.storage
            .from('evidence_vault')
            .getPublicUrl(`${r.client_capture_id}/frame_2.jpg`);
          if (url1?.publicUrl) frameUris.push(url1.publicUrl);
          if (url2?.publicUrl) frameUris.push(url2.publicUrl);
        }

        let videoUrl = r.video_url || null;
        if (!videoUrl && r.client_capture_id) {
          const { data: vData } = supabase.storage
            .from('evidence_vault')
            .getPublicUrl(`${r.client_capture_id}/video.mp4`);
          if (vData?.publicUrl) videoUrl = vData.publicUrl;
        }

        // Real plate number resolution without fake fallbacks
        const rawDetectedPlate = r.citizen_plate || r.vehicle_plate || r.plate_number;
        const validPlate = rawDetectedPlate && rawDetectedPlate !== 'LEA-4471' ? rawDetectedPlate : null;

        return {
          reportId: r.report_id || r.client_capture_id || `RW-${dateObj.getTime().toString().slice(-6)}`,
          caseId: r.case_id || `CASE-${dateObj.getFullYear()}-${(r.report_id ? r.report_id.slice(-4) : dateObj.getTime().toString().slice(-4)).toUpperCase()}`,
          videoUrl,
          plateNumber: validPlate || 'Unidentified',
          rawPlate: validPlate,
          aiPlate: r.vehicle_plate || null,
          vehiclePlate: r.vehicle_plate || null,
          violationType: r.claimed_class || 'unspecified_violation',
          violationName: vInfo.name,
          reporterId: r.reporter_id,
          reporterName: userMap.get(r.reporter_id) || 'Verified Citizen',
          reporterTrust: trustMap.get(r.reporter_id) ?? 100,
          city: 'Lahore',
          locationName: r.location_name || 'Location Not Specified',
          submittedAt: timeAgo,
          rawDate: dateObj.toLocaleDateString('en-PK', { hour: '2-digit', minute: '2-digit' }),
          confidence: r.ai_confidence ? (Number(r.ai_confidence) > 1 ? Math.round(Number(r.ai_confidence)) : Math.round(Number(r.ai_confidence) * 100)) : null,
          clarityScore: r.ai_confidence ? (Number(r.ai_confidence) > 1 ? Math.round(Number(r.ai_confidence)) : Math.round(Number(r.ai_confidence) * 100)) : null,
          status: r.status || 'pending_manual_review',
          isDisputed,
          citizenNote: r.citizen_note || null,
          citizenPlate: r.citizen_plate || null,
          citizenVehicleModel: r.citizen_vehicle_model || null,
          citizenVehicleColor: r.citizen_vehicle_color || null,
          citizenVehicleType: r.citizen_vehicle_type || null,
          frameUris,
          geoLat: r.geo_lat,
          geoLong: r.geo_long,
          fineAmountPkr: vInfo.fine,
        };
      });

      setCases(mapped);
    } catch (err) {
      console.error('Failed to load dashboard cases:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();

    // Listen for real-time submissions from mobile app!
    const channel = supabase
      .channel('officer-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchCases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered by Search
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.plateNumber.toLowerCase().includes(q) ||
        c.caseId.toLowerCase().includes(q) ||
        c.violationName.toLowerCase().includes(q) ||
        c.reporterName.toLowerCase().includes(q)
    );
  }, [cases, searchQuery]);

  // Tab Slices
  const pendingCases = useMemo(
    () =>
      filteredCases.filter(
        (c) =>
          c.status === 'pending_manual_review' ||
          c.status === 'under_review' ||
          c.status === 'submitted'
      ),
    [filteredCases]
  );

  const disputedCases = useMemo(
    () => filteredCases.filter((c) => c.isDisputed),
    [filteredCases]
  );

  const approvedCases = useMemo(
    () => filteredCases.filter((c) => c.status === 'accepted'),
    [filteredCases]
  );

  const rejectedCases = useMemo(
    () => filteredCases.filter((c) => c.status === 'rejected'),
    [filteredCases]
  );

  // Helper to recompute & update reporter's trust score in Supabase
  const syncReporterTrustScore = async (reporterId) => {
    if (!reporterId) return;
    try {
      const { data: repReports } = await supabase
        .from('reports')
        .select('status')
        .eq('reporter_id', reporterId)
        .in('status', ['accepted', 'approved', 'rejected']);

      if (repReports && repReports.length > 0) {
        const approved = repReports.filter((r) => r.status === 'accepted' || r.status === 'approved').length;
        const newScore = Math.max(0, Math.min(100, Math.round((approved / repReports.length) * 100)));
        await supabase
          .from('reporter_profiles')
          .update({ trust_score: newScore })
          .eq('reporter_id', reporterId);
      }
    } catch { }
  };

  // Officer Action: Approve Violation
  const handleApproveCase = async (caseItem, note) => {
    setIsProcessing(true);
    try {
      // 1. Update report status in Supabase
      await supabase
        .from('reports')
        .update({
          status: 'accepted',
          officer_verdict: 'accepted',
          officer_note: note,
          officer_verdict_at: new Date().toISOString(),
        })
        .eq('report_id', caseItem.reportId);

      // 2. Re-compute and update citizen's trust score based on accuracy
      await syncReporterTrustScore(caseItem.reporterId);

      // 3. Credit citizen wallet: PKR 100 review refund + PKR 200 reward bonus = PKR 300!
      try {
        await supabase.rpc('credit_citizen_reward_payout', {
          p_report_id: caseItem.reportId,
          p_payout_amount: 300,
        });
      } catch { }

      // Refresh list
      await fetchCases();
    } catch (e) {
      console.error('Approve violation notice:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Officer Action: Dismiss / Reject Violation
  const handleRejectCase = async (caseItem, note) => {
    setIsProcessing(true);
    try {
      await supabase
        .from('reports')
        .update({
          status: 'rejected',
          officer_verdict: 'rejected',
          officer_note: note,
          officer_verdict_at: new Date().toISOString(),
        })
        .eq('report_id', caseItem.reportId);

      // Re-compute and update citizen's trust score based on accuracy
      await syncReporterTrustScore(caseItem.reporterId);

      await fetchCases();
    } catch (e) {
      console.error('Reject violation notice:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-ink">
      {/* 1. Master Portal Header */}
      <PortalHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        pendingCount={pendingCases.length}
        disputedCount={disputedCases.length}
        approvedCount={approvedCases.length}
        onRefresh={fetchCases}
        isRefreshing={isRefreshing}
      />

      {/* 2. Main Workspace Body: Sidebar + Active View */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <CommandSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={pendingCases.length}
          disputedCount={disputedCases.length}
          approvedCount={approvedCases.length}
          rejectedCount={rejectedCases.length}
        />

        {/* Dynamic Center Workspaces */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas">
          {activeTab === 'Pending Queue' && (
            <PendingQueueWorkspace
              cases={pendingCases}
              onApproveCase={handleApproveCase}
              onRejectCase={handleRejectCase}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'Disputed Cases' && (
            <CaseListWorkspace
              title="Citizen Disputed Cases (PKR 100 Fee Paid)"
              description="Citizens have staked a PKR 100 audit fee challenging automated AI dismissal. Verified violations refund PKR 100 + reward PKR 200 bounty."
              cases={disputedCases}
              tone="accent"
              emptyMessage="No pending citizen disputed cases in queue."
              onSelectCase={() => {
                setActiveTab('Pending Queue');
              }}
            />
          )}

          {activeTab === 'Approved Today' && (
            <CaseListWorkspace
              title="Approved Traffic Citations (Today)"
              description="Legally confirmed citations with sealed evidentiary video dossier and credited citizen bounties."
              cases={approvedCases}
              tone="valid"
              emptyMessage="No citations approved today yet."
            />
          )}

          {activeTab === 'Rejected Cases' && (
            <CaseListWorkspace
              title="Dismissed / Rejected Reports"
              description="Submissions dismissed due to unreadable license plates, lawful maneuvers, or low clarity footage."
              cases={rejectedCases}
              tone="danger"
              emptyMessage="No reports dismissed."
            />
          )}

          {activeTab === 'Reporter Registry' && <ReporterRegistryWorkspace />}
        </main>
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

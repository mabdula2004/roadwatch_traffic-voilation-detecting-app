import React, { useState } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Clock,
  MapPin,
  Car,
  FileText,
  User,
  Sparkles,
  AlertTriangle,
  ZoomIn,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import type { RealQueueCase } from '../types/dashboard';

interface PendingQueueWorkspaceProps {
  cases: RealQueueCase[];
  onApproveCase: (caseItem: RealQueueCase, officerNote: string) => Promise<void>;
  onRejectCase: (caseItem: RealQueueCase, officerNote: string) => Promise<void>;
  isProcessing: boolean;
}

export function PendingQueueWorkspace({
  cases,
  onApproveCase,
  onRejectCase,
  isProcessing,
}: PendingQueueWorkspaceProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.reportId || '');
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [officerNote, setOfficerNote] = useState<string>('');
  const [zoomModalImage, setZoomModalImage] = useState<string | null>(null);

  const selectedCase = cases.find((c) => c.reportId === selectedCaseId) || cases[0];

  const handleApprove = async () => {
    if (!selectedCase) return;
    await onApproveCase(selectedCase, officerNote || 'Violation confirmed upon evidentiary review.');
    setOfficerNote('');
  };

  const handleReject = async () => {
    if (!selectedCase) return;
    await onRejectCase(selectedCase, officerNote || 'Evidence insufficient to confirm violation.');
    setOfficerNote('');
  };

  if (!selectedCase) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-edge bg-surface text-muted">
            <CheckCircle2 className="h-7 w-7 text-valid" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold text-ink">
            Audit Queue Cleared
          </h3>
          <p className="mt-1 text-xs text-muted">
            There are currently no pending violation reports requiring officer audit in this queue. New reports will appear live as submitted by citizens.
          </p>
        </div>
      </div>
    );
  }

  const frames = selectedCase.frameUris || [];
  const currentFrameUri = frames[selectedFrameIndex] || frames[0] || null;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* =========================================================================
          LEFT COLUMN: Live Pending Cases Queue (320px)
         ========================================================================= */}
      <div className="thin-scroll flex w-80 shrink-0 flex-col border-r border-edge bg-canvas/60 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-surface/90 px-4 py-3 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Pending Cases ({cases.length})
          </p>
          <span className="text-[10px] font-semibold text-telemetry">Priority Audit</span>
        </div>

        <div className="divide-y divide-edge/60">
          {cases.map((c) => {
            const isSelected = c.reportId === selectedCase.reportId;
            return (
              <button
                key={c.reportId}
                onClick={() => {
                  setSelectedCaseId(c.reportId);
                  setSelectedFrameIndex(0);
                  setOfficerNote('');
                }}
                className={`flex w-full flex-col p-4 text-left transition-all ${
                  isSelected
                    ? 'border-l-4 border-accent bg-surface/90 text-ink shadow-inner'
                    : 'border-l-4 border-transparent text-muted hover:bg-surface/40 hover:text-ink'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="tabular font-display text-sm font-bold text-ink">
                    {c.plateNumber || 'PLATE UNKNOWN'}
                  </span>
                  <span className="text-[10px] text-muted">{c.submittedAt}</span>
                </div>

                <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink">
                  {c.violationName}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {c.isDisputed && (
                    <Badge tone="accent">
                      PKR 100 Disputed
                    </Badge>
                  )}
                  <Badge tone={c.confidence >= 80 ? 'valid' : 'telemetry'}>
                    AI {c.confidence}%
                  </Badge>
                  <span className="truncate text-2xs text-muted">
                    {c.locationName || 'Lahore'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Master Evidence Inspection Station
         ========================================================================= */}
      <div className="thin-scroll flex flex-1 flex-col overflow-y-auto bg-canvas p-6">
        {/* Top Header of Selected Case */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-edge pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="tabular font-display text-2xl font-bold tracking-tight text-ink">
                {selectedCase.plateNumber || 'NO PLATE DETECTED'}
              </span>
              <Badge tone={selectedCase.isDisputed ? 'accent' : 'telemetry'}>
                {selectedCase.isDisputed ? 'CITIZEN PKR 100 DISPUTE' : 'AUTOMATED AI FLAGGED'}
              </Badge>
              <span className="rounded border border-edge bg-surface px-2 py-0.5 text-2xs font-semibold text-muted">
                {selectedCase.caseId}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted">
              Reported by <span className="font-semibold text-ink">{selectedCase.reporterName}</span> · Trust Score: <span className="font-bold text-valid">{selectedCase.reporterTrust}%</span> · {selectedCase.submittedAt}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-edge bg-surface/80 px-4 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Statutory Penalty</p>
              <p className="tabular font-display text-lg font-bold text-accent">
                PKR {selectedCase.fineAmountPkr.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Inspection Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Visual Evidence Station (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            {/* Main Stage Image / Video Viewer */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-edge bg-black shadow-lg">
              {currentFrameUri ? (
                <img
                  src={currentFrameUri}
                  alt="Evidence Frame"
                  className="h-full w-full object-contain cursor-zoom-in"
                  onClick={() => setZoomModalImage(currentFrameUri)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-muted">
                  <Car className="h-10 w-10 text-muted/40" />
                  <p className="mt-2 text-xs">No visual evidence keyframe recorded</p>
                </div>
              )}

              {/* Overlay Badges */}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded bg-black/75 px-2 py-1 text-2xs font-bold text-white backdrop-blur-sm">
                  FRAME {selectedFrameIndex + 1} OF {frames.length || 1}
                </span>
                {selectedFrameIndex === 1 && (
                  <span className="rounded bg-signal/90 px-2 py-1 text-2xs font-bold text-white shadow-glow-red">
                    ⚡ VIOLATION MOMENT
                  </span>
                )}
              </div>

              {/* Zoom Button */}
              {currentFrameUri && (
                <button
                  onClick={() => setZoomModalImage(currentFrameUri)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/80 px-2.5 py-1.5 text-2xs font-bold text-white shadow backdrop-blur-sm transition hover:bg-black"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  <span>Inspect High-Res (100%)</span>
                </button>
              )}
            </div>

            {/* Evidence Frame Thumbnails Selector */}
            {frames.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {frames.map((fUri, idx) => {
                  const isSelected = selectedFrameIndex === idx;
                  const label = idx === 0 ? 'Approach' : idx === 1 ? 'Infraction' : 'Exit Plate';
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedFrameIndex(idx)}
                      className={`relative flex-1 overflow-hidden rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-accent ring-2 ring-accent/30 shadow-md'
                          : 'border-edge opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={fUri} alt={label} className="h-16 w-full object-cover" />
                      <div className="bg-surface/90 px-2 py-1 text-center text-2xs font-bold text-ink">
                        {label} (#{idx + 1})
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Geolocation & Telemetry Strip */}
            <div className="flex items-center justify-between rounded-xl border border-edge bg-surface/40 p-3 text-xs">
              <div className="flex items-center gap-2 text-muted">
                <MapPin className="h-4 w-4 text-telemetry" />
                <span className="font-semibold text-ink">{selectedCase.locationName || 'Lahore Urban Sector'}</span>
                {selectedCase.geoLat && selectedCase.geoLong && (
                  <span className="text-2xs text-muted">
                    ({selectedCase.geoLat.toFixed(4)}, {selectedCase.geoLong.toFixed(4)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Clock className="h-4 w-4 text-muted" />
                <span>{selectedCase.rawDate || selectedCase.submittedAt}</span>
              </div>
            </div>
          </div>

          {/* Forensic Data & Verification Station (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Citizen Note (Especially if citizen edited details) */}
            {selectedCase.citizenNote && (
              <div className="rounded-xl border border-telemetry/40 bg-telemetry/10 p-3">
                <div className="flex items-center gap-2 text-2xs font-bold text-telemetry">
                  <FileText className="h-3.5 w-3.5" />
                  <span>CITIZEN AUDIT NOTE (ESC-100)</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink">
                  "{selectedCase.citizenNote}"
                </p>
              </div>
            )}

            {/* Forensic Attribute Comparison Table */}
            <div className="overflow-hidden rounded-xl border border-edge bg-surface/60">
              <div className="border-b border-edge bg-surface/90 px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Forensic Attribution & Verification
                </p>
              </div>

              <div className="divide-y divide-edge/70 text-xs">
                {/* License Plate */}
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted">License Plate</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular font-display font-bold text-ink">
                      {selectedCase.citizenPlate || selectedCase.plateNumber || 'Unreadable'}
                    </span>
                    {selectedCase.citizenPlate ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs font-bold text-accent">
                        CITIZEN CORRECTED
                      </span>
                    ) : (
                      <span className="rounded bg-valid/15 px-1.5 py-0.5 text-2xs font-bold text-valid">
                        AI DETECTED
                      </span>
                    )}
                  </div>
                </div>

                {/* Target Vehicle */}
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted">Target Vehicle</span>
                  <span className="font-semibold text-ink">
                    {selectedCase.citizenVehicleColor || ''} {selectedCase.citizenVehicleModel || selectedCase.citizenVehicleType || 'Vehicle Identified'}
                  </span>
                </div>

                {/* Violation Classification */}
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted">Violation Code</span>
                  <span className="font-bold text-accent">
                    {selectedCase.violationName}
                  </span>
                </div>

                {/* AI Visual Clarity */}
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted">AI Clarity Confidence</span>
                  <span className="tabular font-bold text-valid">
                    {selectedCase.clarityScore || selectedCase.confidence}% Clear
                  </span>
                </div>
              </div>
            </div>

            {/* Officer Audit Verdict Form */}
            <div className="rounded-xl border border-edge bg-surface/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Officer Verdict & Remarks
              </p>
              <textarea
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
                placeholder="Enter certified officer inspection remarks (e.g. Plate verified on exit frame, red light crossed into intersection)..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-edge bg-canvas/70 p-2.5 text-xs text-ink placeholder-muted transition focus:border-telemetry focus:outline-none"
              />

              {/* Action Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 rounded-xl border border-valid/50 bg-valid/15 px-4 py-3 font-display text-xs font-bold text-valid shadow-glow-green transition hover:bg-valid hover:text-black disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Confirm Violation (Payout PKR 300)</span>
                </button>

                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 rounded-xl border border-signal/50 bg-signal/15 px-4 py-3 font-display text-xs font-bold text-signal shadow-glow-red transition hover:bg-signal hover:text-white disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Dismiss (Forfeit PKR 100)</span>
                </button>
              </div>

              <p className="mt-2 text-center text-2xs text-muted">
                Confirming violation automatically issues legal e-citation and refunds citizen PKR 100 + PKR 200 bounty reward.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FULL RESOLUTION ZOOM LIGHTBOX
         ========================================================================= */}
      {zoomModalImage && (
        <div
          onClick={() => setZoomModalImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        >
          <div className="relative max-h-full max-w-5xl overflow-hidden rounded-2xl border border-edge bg-canvas p-2">
            <button
              onClick={() => setZoomModalImage(null)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={zoomModalImage}
              alt="Zoomed Plate Forensics"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  UserCheck,
  Users,
  MapPin,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
  Building,
  CheckCircle2,
  Key,
  BadgeAlert,
  ArrowLeft,
} from 'lucide-react';
import { DIVISIONS } from '../data/divisions';

export function OnboardingPortal({
  divisions = DIVISIONS,
  officers = [],
  onSelectPersona,
  currentDivisionId = 'lahore_div',
  onClose,
  canClose = false,
}) {
  // Step 1: Role ('admin' | 'officer')
  const [selectedRole, setSelectedRole] = useState('admin');

  // Step 2: Division & Officer selection
  const [selectedDivisionId, setSelectedDivisionId] = useState(currentDivisionId);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const currentDiv = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];

  // Officers belonging strictly to this division
  const divisionOfficers = officers.filter((o) => o.divisionId === currentDiv.id);
  const activeOfficers = divisionOfficers.filter((o) => o.status === 'active');

  const handleLaunch = () => {
    if (selectedRole === 'admin') {
      onSelectPersona({
        role: 'admin',
        divisionId: currentDiv.id,
        user: {
          ...currentDiv.admin,
          isDivisionAdmin: true,
        },
      });
    } else {
      // Review Officer
      const officerToUse =
        divisionOfficers.find((o) => o.id === selectedOfficerId) ||
        activeOfficers[0] ||
        divisionOfficers[0];

      if (!officerToUse) {
        setErrorMessage(
          `No officers found under ${currentDiv.name}. Please enter as Division Admin first to provision officers.`
        );
        return;
      }

      onSelectPersona({
        role: 'officer',
        divisionId: currentDiv.id,
        user: {
          ...officerToUse,
          isDivisionAdmin: false,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/95 backdrop-blur-xl p-4 sm:p-6 thin-scroll">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl transition-all duration-700 ${
            selectedRole === 'admin' ? 'bg-accent/15' : 'bg-telemetry/15'
          }`}
        />
        <div
          className={`absolute -right-32 -bottom-32 h-96 w-96 rounded-full blur-3xl transition-all duration-700 ${
            selectedRole === 'admin' ? 'bg-amber-600/10' : 'bg-blue-600/10'
          }`}
        />
      </div>

      <div className="relative my-auto w-full max-w-4xl rounded-3xl border border-edge bg-surface/95 shadow-2xl backdrop-blur-md overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="border-b border-edge bg-gradient-to-r from-surface via-canvas to-surface px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                  selectedRole === 'admin'
                    ? 'border-accent/40 bg-accent/15 text-accent shadow-glow-amber'
                    : 'border-telemetry/40 bg-telemetry/15 text-telemetry shadow-glow-cyan'
                }`}
              >
                {selectedRole === 'admin' ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <UserCheck className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-lg font-bold tracking-tight text-ink">
                    RoadWatch Enforcement Onboarding
                  </h1>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      selectedRole === 'admin'
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-telemetry/15 text-telemetry border border-telemetry/30'
                    }`}
                  >
                    {selectedRole === 'admin' ? 'ADMIN ONBOARDING' : 'OFFICER ONBOARDING'}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Choose duty role (Admin vs Review Officer) and select assigned division
                </p>
              </div>
            </div>

            {canClose && (
              <button
                onClick={onClose}
                className="self-start sm:self-auto rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink transition"
              >
                Return to Workspace
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-7">
          {/* STEP 1: ROLE SELECTION (ADMIN YA OFFICER) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-2xs font-bold text-black ${
                    selectedRole === 'admin' ? 'bg-accent' : 'bg-telemetry'
                  }`}
                >
                  1
                </span>
                <h2 className="font-display text-sm font-bold text-ink">
                  Identify Your Duty Role: Admin ya Officer?
                </h2>
              </div>
              <span className="text-2xs text-muted">
                Select your security level and operational purpose
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Role 1: Division Administrator */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMessage('');
                }}
                className={`relative flex flex-col text-left rounded-2xl border p-5 transition-all ${
                  selectedRole === 'admin'
                    ? 'border-accent bg-accent/10 shadow-glow-amber ring-2 ring-accent/60 scale-[1.01]'
                    : 'border-edge bg-surface/50 hover:border-accent/40 hover:bg-surface/80'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/20 text-accent">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Division Administrator (Admin)
                      </h3>
                      <span className="text-[11px] font-semibold text-accent">
                        Sole Division Commander (1 per Division)
                      </span>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center transition ${
                      selectedRole === 'admin'
                        ? 'border-accent bg-accent text-black'
                        : 'border-edge bg-canvas'
                    }`}
                  >
                    {selectedRole === 'admin' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Command role for Superintendents / Chiefs. Authorized to <strong className="text-ink">create and provision new review officers</strong>, manage duty rosters, toggle suspensions, and oversee regional enforcement analytics.
                </p>

                <div className="mt-4 flex items-center gap-2 text-2xs text-accent font-semibold">
                  <span>✓ Creates officers</span>
                  <span>·</span>
                  <span>✓ Division roster oversight</span>
                  <span>·</span>
                  <span>✓ Audit integrity</span>
                </div>
              </button>

              {/* Role 2: Traffic Review Officer */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('officer');
                  setErrorMessage('');
                }}
                className={`relative flex flex-col text-left rounded-2xl border p-5 transition-all ${
                  selectedRole === 'officer'
                    ? 'border-telemetry bg-telemetry/10 shadow-glow-cyan ring-2 ring-telemetry/60 scale-[1.01]'
                    : 'border-edge bg-surface/50 hover:border-telemetry/40 hover:bg-surface/80'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-telemetry/40 bg-telemetry/20 text-telemetry">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Traffic Review Officer (Warden)
                      </h3>
                      <span className="text-[11px] font-semibold text-telemetry">
                        Duty Enforcement Station
                      </span>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center transition ${
                      selectedRole === 'officer'
                        ? 'border-telemetry bg-telemetry text-black'
                        : 'border-edge bg-canvas'
                    }`}
                  >
                    {selectedRole === 'officer' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Operational role for certified wardens created under the Division Admin. Authorized to <strong className="text-ink">review video evidence</strong>, confirm number plates, resolve citizen disputes, and approve/reject fines.
                </p>

                <div className="mt-4 flex items-center gap-2 text-2xs text-telemetry font-semibold">
                  <span>✓ Reviews pending violations</span>
                  <span>·</span>
                  <span>✓ Audits disputes</span>
                  <span>·</span>
                  <span>✓ Issues e-challans</span>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: DIVISION & CREDENTIAL SETUP */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-2xs font-bold text-black ${
                    selectedRole === 'admin' ? 'bg-accent' : 'bg-telemetry'
                  }`}
                >
                  2
                </span>
                <h2 className="font-display text-sm font-bold text-ink">
                  {selectedRole === 'admin'
                    ? 'Select Division You Command (1 Admin per Division)'
                    : 'Select Your Division & Officer Profile'}
                </h2>
              </div>
              <span className="text-2xs text-muted">
                Officers report strictly to their Division Administrator
              </span>
            </div>

            {/* Division Selection Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {divisions.map((div) => {
                const isSelected = div.id === selectedDivisionId;
                const divOfficersCount = officers.filter((o) => o.divisionId === div.id).length;

                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => {
                      setSelectedDivisionId(div.id);
                      setSelectedOfficerId('');
                      setErrorMessage('');
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? selectedRole === 'admin'
                          ? 'border-accent bg-accent/15 shadow-glow-amber ring-1 ring-accent'
                          : 'border-telemetry bg-telemetry/15 shadow-glow-cyan ring-1 ring-telemetry'
                        : 'border-edge bg-canvas/60 hover:border-edge/90 hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold" style={{ color: div.color }}>
                        {div.code}
                      </span>
                      <span className="rounded bg-canvas/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {divOfficersCount} Officers
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-ink truncate">
                      {div.shortName}
                    </div>
                    <div className="text-[10px] text-muted truncate">
                      Admin: {div.admin.name.split(' ').slice(0, 3).join(' ')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ROLE-SPECIFIC IDENTITY DETAILS */}
            <div className="mt-4 rounded-2xl border border-edge bg-canvas/70 p-4">
              {selectedRole === 'admin' ? (
                /* Admin Identity Confirmation */
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-2xs font-bold uppercase tracking-wider text-accent">
                      Confirmed Sole Division Administrator
                    </span>
                    <h4 className="text-sm font-bold text-ink mt-0.5">
                      {currentDiv.admin.name} ({currentDiv.admin.badge})
                    </h4>
                    <p className="text-xs text-muted">
                      {currentDiv.admin.rank} · {currentDiv.hq}
                    </p>
                    <p className="text-2xs text-telemetry mt-1">
                      Clearance: {currentDiv.admin.clearance} · Oversight of {divisionOfficers.length} officers
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-mono font-bold text-accent">
                      PIN: **** (Verified)
                    </span>
                  </div>
                </div>
              ) : (
                /* Officer Identity Selection */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-telemetry">
                      Select Your Provisioned Officer Profile under {currentDiv.name}
                    </span>
                    <span className="text-2xs text-muted">
                      Reporting to: {currentDiv.admin.name}
                    </span>
                  </div>

                  {divisionOfficers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {divisionOfficers.map((off) => {
                        const isChosen =
                          selectedOfficerId === off.id ||
                          (!selectedOfficerId && off.id === divisionOfficers[0]?.id);
                        return (
                          <div
                            key={off.id}
                            onClick={() => {
                              setSelectedOfficerId(off.id);
                              setErrorMessage('');
                            }}
                            className={`cursor-pointer rounded-xl border p-3 transition-all ${
                              isChosen
                                ? 'border-telemetry bg-telemetry/15 shadow-glow-cyan'
                                : 'border-edge bg-surface/50 hover:border-telemetry/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-ink">{off.name}</span>
                              <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-bold text-telemetry">
                                {off.badge}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-2xs text-muted">
                              <span>{off.rank}</span>
                              <span
                                className={`rounded px-1.5 py-0.2 uppercase font-bold text-[9px] ${
                                  off.status === 'active'
                                    ? 'bg-valid/15 text-valid'
                                    : 'bg-canvas text-muted'
                                }`}
                              >
                                {off.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted truncate">
                              Sector: {off.sector}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-edge bg-surface/30 p-4 text-center">
                      <p className="text-xs text-muted">
                        No officers have been created under <strong className="text-ink">{currentDiv.name}</strong> yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('admin')}
                        className="mt-2 text-xs font-bold text-accent hover:underline"
                      >
                        → Switch to Division Admin to provision officers
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-signal/40 bg-signal/15 px-4 py-2.5 text-xs text-signal animate-fadeIn">
              <BadgeAlert className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Shortcuts */}
          <div className="rounded-2xl border border-edge bg-canvas/40 p-3.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted">
                1-Click Quick Testing Shortcuts:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDivisionId('lahore_div');
                    setSelectedRole('admin');
                    onSelectPersona({
                      role: 'admin',
                      divisionId: 'lahore_div',
                      user: { ...DIVISIONS[0].admin, isDivisionAdmin: true },
                    });
                  }}
                  className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-2xs font-bold text-accent transition hover:bg-accent/25"
                >
                  ⚡ Enter as Lahore Division Admin
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDivisionId('lahore_div');
                    setSelectedRole('officer');
                    const off = divisionOfficers[0] || officers[0];
                    onSelectPersona({
                      role: 'officer',
                      divisionId: 'lahore_div',
                      user: { ...off, isDivisionAdmin: false },
                    });
                  }}
                  className="rounded-lg border border-telemetry/40 bg-telemetry/15 px-3 py-1.5 text-2xs font-bold text-telemetry transition hover:bg-telemetry/25"
                >
                  ⚡ Enter as Traffic Review Officer
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Launch Button */}
          <div className="flex items-center justify-between border-t border-edge pt-4">
            <div className="text-xs text-muted">
              Entering <strong className="text-ink">{currentDiv.name}</strong> as{' '}
              <strong className={selectedRole === 'admin' ? 'text-accent' : 'text-telemetry'}>
                {selectedRole === 'admin'
                  ? `Sole Division Admin (${currentDiv.admin.name})`
                  : 'Certified Traffic Review Officer'}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleLaunch}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-black shadow-lg transition-all hover:scale-105 active:scale-95 ${
                selectedRole === 'admin'
                  ? 'border border-accent/60 bg-gradient-to-r from-accent to-amber-600 shadow-glow-amber'
                  : 'border border-telemetry/60 bg-gradient-to-r from-telemetry to-blue-600 shadow-glow-cyan'
              }`}
            >
              <span>
                {selectedRole === 'admin'
                  ? 'Launch Division Admin Portal'
                  : 'Launch Officer Review Workstation'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

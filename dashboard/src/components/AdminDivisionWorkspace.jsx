import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Shield,
  Key,
  ChevronRight,
  TrendingUp,
  Award,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  ExternalLink,
  Lock,
} from 'lucide-react';

export function AdminDivisionWorkspace({
  currentDivision,
  currentRole = 'admin',
  officers,
  onAddOfficer,
  onUpdateOfficerStatus,
  onDeleteOfficer,
  onSelectOfficerToReview,
  todayCasesCount = 0,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'on_leave' | 'suspended'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const isAdmin = currentRole === 'division_admin' || currentRole === 'admin';

  // New Officer Form State
  const [formName, setFormName] = useState('');
  const [formRank, setFormRank] = useState('Inspector (Senior Audit Warden)');
  const [formBadge, setFormBadge] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSector, setFormSector] = useState(currentDivision.sectors[0] || 'Mall Road & Civil Lines');
  const [formShift, setFormShift] = useState('Morning (07:00 - 15:00)');
  const [formPin, setFormPin] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  // Filter officers strictly for this division
  const divisionOfficers = useMemo(() => {
    return officers.filter((o) => o.divisionId === currentDivision.id);
  }, [officers, currentDivision.id]);

  // Search & Filter
  const filteredOfficers = useMemo(() => {
    return divisionOfficers.filter((off) => {
      const matchesSearch =
        off.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        off.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (off.sector && off.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
        off.rank.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true : off.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [divisionOfficers, searchQuery, statusFilter]);

  // Metrics
  const totalOfficers = divisionOfficers.length;
  const activeCount = divisionOfficers.filter((o) => o.status === 'active').length;
  const leaveCount = divisionOfficers.filter((o) => o.status === 'on_leave').length;
  const suspendedCount = divisionOfficers.filter((o) => o.status === 'suspended').length;
  const totalReviewed = divisionOfficers.reduce((acc, curr) => acc + (curr.casesReviewedToday || 0), 0);
  const avgAccuracy = totalOfficers > 0
    ? (divisionOfficers.reduce((acc, curr) => acc + (curr.accuracyRate || 98), 0) / totalOfficers).toFixed(1)
    : 98.5;

  // Auto-generate Badge helper
  const handleGenerateBadge = () => {
    const prefix = currentDivision.code === 'KHI' ? 'KTP' : 'PTP';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const newBadge = `${prefix}-${randNum}`;
    setFormBadge(newBadge);
    if (!formPin) {
      setFormPin(String(randNum));
    }
  };

  const handleOpenModal = () => {
    handleGenerateBadge();
    setFormName('');
    setFormEmail('');
    setFormPhone('+92 300 ');
    setFormRank('Inspector (Senior Audit Warden)');
    setFormSector(currentDivision.sectors[0] || 'General Enforcement Sector');
    setFormShift('Morning (07:00 - 15:00)');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleSubmitNewOfficer = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formBadge.trim()) {
      alert('Please fill officer name and badge ID.');
      return;
    }

    const newOfficer = {
      id: `off_${currentDivision.code.toLowerCase()}_${Date.now().toString().slice(-5)}`,
      divisionId: currentDivision.id,
      badge: formBadge.trim().toUpperCase(),
      name: formName.trim(),
      rank: formRank,
      email: formEmail.trim() || `${formBadge.toLowerCase().replace('-', '')}@traffic.punjab.gov.pk`,
      phone: formPhone.trim() || '+92 300 0000000',
      sector: formSector,
      shift: formShift,
      status: formStatus,
      joinedDate: new Date().toISOString().split('T')[0],
      casesReviewedToday: 0,
      accuracyRate: 98.8,
      pin: formPin || '1234',
    };

    onAddOfficer(newOfficer);
    setIsModalOpen(false);

    setFeedbackMessage(`Officer ${newOfficer.name} (${newOfficer.badge}) provisioned successfully!`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-canvas thin-scroll">
      {/* 1. Division Header Banner */}
      <div className="relative border-b border-edge bg-gradient-to-r from-surface via-surface/90 to-surface/40 px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-glow-amber"
              style={{
                borderColor: `${currentDivision.color}60`,
                backgroundColor: `${currentDivision.color}15`,
                color: currentDivision.color,
              }}
            >
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl font-bold tracking-tight text-ink">
                  {currentDivision.name}
                </h1>
                <span className="rounded-md border border-accent/40 bg-accent/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-accent">
                  Sole Division Administrator
                </span>
                <span className="rounded-md border border-edge bg-canvas/60 px-2 py-0.5 text-2xs font-semibold text-muted">
                  {currentDivision.district} · {currentDivision.province}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-telemetry" />
                  <strong className="text-ink">{currentDivision.admin.name}</strong> ({currentDivision.admin.badge})
                </span>
                <span className="text-edge">|</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted" />
                  {currentDivision.hq}
                </span>
                <span className="text-edge">|</span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted" />
                  {currentDivision.admin.email}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button: Provision New Officer (Admin Only) */}
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button
                onClick={handleOpenModal}
                className="flex items-center gap-2 rounded-xl border border-accent/60 bg-gradient-to-r from-accent to-amber-600 px-4 py-2.5 text-xs font-bold text-black shadow-glow-amber transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Provision New Officer</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-edge bg-canvas/80 px-3.5 py-2 text-2xs text-muted">
                <Lock className="h-3.5 w-3.5 text-telemetry" />
                <span>Officer View (Admin provisions officers)</span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-valid/40 bg-valid/15 px-4 py-2.5 text-xs font-semibold text-valid shadow-glow-green animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-valid/80 hover:text-valid"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 gap-4 border-b border-edge bg-surface/20 px-8 py-5 md:grid-cols-4">
        <div className="rounded-xl border border-edge bg-canvas/70 p-4 transition-all hover:border-accent/40">
          <div className="flex items-center justify-between text-muted">
            <span className="text-2xs font-bold uppercase tracking-wider">Total Enrolled Officers</span>
            <Users className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular text-ink">{totalOfficers}</span>
            <span className="text-2xs text-muted">under this Admin</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-2xs">
            <span className="inline-flex items-center gap-1 text-valid">
              <span className="h-1.5 w-1.5 rounded-full bg-valid animate-pulse" />
              {activeCount} On-Duty
            </span>
            <span className="text-edge">·</span>
            <span className="text-muted">{leaveCount} Leave</span>
            {suspendedCount > 0 && (
              <>
                <span className="text-edge">·</span>
                <span className="text-signal">{suspendedCount} Suspended</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-canvas/70 p-4 transition-all hover:border-telemetry/40">
          <div className="flex items-center justify-between text-muted">
            <span className="text-2xs font-bold uppercase tracking-wider">Today's Division Reviews</span>
            <CheckCircle2 className="h-4 w-4 text-telemetry" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular text-telemetry">
              {totalReviewed + todayCasesCount}
            </span>
            <span className="text-2xs text-muted">violations verified</span>
          </div>
          <p className="mt-2 text-2xs text-muted">
            Across {currentDivision.sectors.length} enforcement sectors
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-canvas/70 p-4 transition-all hover:border-valid/40">
          <div className="flex items-center justify-between text-muted">
            <span className="text-2xs font-bold uppercase tracking-wider">Enforcement Accuracy</span>
            <Award className="h-4 w-4 text-valid" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular text-valid">{avgAccuracy}%</span>
            <span className="text-2xs text-valid/80">Audit Standard</span>
          </div>
          <p className="mt-2 text-2xs text-muted">
            Zero unlawful citations upheld
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-canvas/70 p-4 transition-all hover:border-edge">
          <div className="flex items-center justify-between text-muted">
            <span className="text-2xs font-bold uppercase tracking-wider">Sole Admin Hierarchy</span>
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-ink">{currentDivision.admin.rank}</span>
            <p className="text-2xs text-muted">{currentDivision.admin.clearance}</p>
          </div>
          <p className="mt-2 text-2xs text-accent">
            Single Point of Authority for {currentDivision.shortName}
          </p>
        </div>
      </div>

      {/* 3. Officers Management Section */}
      <div className="flex-1 px-8 py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Roster of Review Officers & Wardens
            </h2>
            <p className="text-xs text-muted">
              All certified review personnel reporting to {currentDivision.admin.name}.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search officer, badge, sector..."
                className="w-full rounded-lg border border-edge bg-surface/70 py-1.5 pl-8 pr-3 text-xs text-ink placeholder-muted transition-colors focus:border-accent focus:outline-none"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex rounded-lg border border-edge bg-surface/50 p-0.5 text-2xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded px-2.5 py-1 transition ${
                  statusFilter === 'all' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                All ({divisionOfficers.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`rounded px-2.5 py-1 transition ${
                  statusFilter === 'active' ? 'bg-valid/20 text-valid' : 'text-muted hover:text-ink'
                }`}
              >
                On Duty ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('on_leave')}
                className={`rounded px-2.5 py-1 transition ${
                  statusFilter === 'on_leave' ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Leave ({leaveCount})
              </button>
              <button
                onClick={() => setStatusFilter('suspended')}
                className={`rounded px-2.5 py-1 transition ${
                  statusFilter === 'suspended' ? 'bg-signal/20 text-signal' : 'text-muted hover:text-ink'
                }`}
              >
                Suspended ({suspendedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Officers Table */}
        {filteredOfficers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge bg-surface/30 p-12 text-center">
            <Users className="h-10 w-10 text-muted opacity-40" />
            <h3 className="mt-3 text-sm font-bold text-ink">No Officers Found</h3>
            <p className="mt-1 text-xs text-muted">
              {searchQuery
                ? 'No officers match your search query.'
                : 'No officers have been provisioned under this division yet.'}
            </p>
            <button
              onClick={handleOpenModal}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-3.5 py-1.5 text-xs font-bold text-accent hover:bg-accent/25"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Provision First Officer</span>
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-edge bg-surface/40 shadow-sm">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-edge bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 pl-5 pr-3">Officer Details</th>
                  <th className="py-3 px-3">Rank & Credentials</th>
                  <th className="py-3 px-3">Assigned Sector / Beat</th>
                  <th className="py-3 px-3">Shift</th>
                  <th className="py-3 px-3">Duty Status</th>
                  <th className="py-3 px-3 text-center">Reviews Today</th>
                  <th className="py-3 px-3 text-center">Accuracy</th>
                  <th className="py-3 pl-3 pr-5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {filteredOfficers.map((officer) => {
                  const isActive = officer.status === 'active';
                  const isSuspended = officer.status === 'suspended';
                  const isOnLeave = officer.status === 'on_leave';

                  return (
                    <tr
                      key={officer.id}
                      className="transition-colors hover:bg-surface/70"
                    >
                      {/* Name & Badge */}
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface font-display text-xs font-bold text-ink">
                            {officer.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">{officer.name}</span>
                              <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-bold text-accent">
                                {officer.badge}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-2xs text-muted">
                              <span>{officer.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rank */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-ink/90">{officer.rank}</span>
                        <div className="text-2xs text-muted">PIN: **** (Protected)</div>
                      </td>

                      {/* Sector */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-ink/90">
                          <MapPin className="h-3 w-3 text-telemetry shrink-0" />
                          <span>{officer.sector}</span>
                        </div>
                      </td>

                      {/* Shift */}
                      <td className="py-3.5 px-3 text-muted">
                        <div className="flex items-center gap-1 text-2xs">
                          <Clock className="h-3 w-3 text-muted shrink-0" />
                          <span>{officer.shift}</span>
                        </div>
                      </td>

                      {/* Duty Status */}
                      <td className="py-3.5 px-3">
                        <div className="relative inline-block">
                          {isAdmin ? (
                            <button
                              onClick={() => {
                                const nextStatus =
                                  officer.status === 'active'
                                    ? 'on_leave'
                                    : officer.status === 'on_leave'
                                    ? 'suspended'
                                    : 'active';
                                onUpdateOfficerStatus(officer.id, nextStatus);
                              }}
                              title="Admin: Click to toggle officer duty status"
                              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-bold transition-all hover:scale-105 ${
                                isActive
                                  ? 'border-valid/40 bg-valid/15 text-valid'
                                  : isSuspended
                                  ? 'border-signal/40 bg-signal/15 text-signal'
                                  : 'border-edge bg-canvas text-muted'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? 'bg-valid animate-pulse' : isSuspended ? 'bg-signal' : 'bg-muted'
                                }`}
                              />
                              <span className="capitalize">
                                {officer.status === 'on_leave' ? 'On Leave' : officer.status}
                              </span>
                            </button>
                          ) : (
                            <div
                              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-bold ${
                                isActive
                                  ? 'border-valid/40 bg-valid/15 text-valid'
                                  : isSuspended
                                  ? 'border-signal/40 bg-signal/15 text-signal'
                                  : 'border-edge bg-canvas text-muted'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? 'bg-valid' : isSuspended ? 'bg-signal' : 'bg-muted'
                                }`}
                              />
                              <span className="capitalize">
                                {officer.status === 'on_leave' ? 'On Leave' : officer.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Reviews Today */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-display font-bold tabular text-ink">
                          {officer.casesReviewedToday}
                        </span>
                        <span className="block text-[10px] text-muted">cases</span>
                      </td>

                      {/* Accuracy */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold tabular text-valid">
                          {officer.accuracyRate}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Log in as this officer / Launch review queue */}
                          <button
                            onClick={() => onSelectOfficerToReview(officer)}
                            title="Open Queue as this Officer"
                            className="flex items-center gap-1 rounded-lg border border-edge bg-surface px-2.5 py-1 text-2xs font-bold text-muted transition hover:border-accent hover:text-accent"
                          >
                            <span>Open Queue</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>

                          {/* Delete Officer (Admin Only) */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Decommission and remove Officer ${officer.name} (${officer.badge})?`)) {
                                  onDeleteOfficer(officer.id);
                                }
                              }}
                              title="Admin: Delete / Decommission Officer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge bg-surface text-muted transition hover:border-signal/40 hover:bg-signal/10 hover:text-signal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Division Command Protocol Card */}
        <div className="mt-8 rounded-2xl border border-edge bg-gradient-to-r from-canvas via-surface/40 to-canvas p-5">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-accent">
            <Sparkles className="h-4 w-4" />
            <span>Division Administrative Protocol — Rule 4B</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            All officers created within <strong className="text-ink">{currentDivision.name}</strong> operate under the direct oversight of{' '}
            <strong className="text-ink">{currentDivision.admin.name}</strong>. Certified review officers must strictly verify vehicle registration plate clarity and confirm violations before signing electronic citations. Citizens disputing automated AI decisions are protected by provincial traffic audit standards.
          </p>
        </div>
      </div>

      {/* 4. MODAL: Provision New Officer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-edge bg-surface p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-edge pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/15 text-accent">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Provision New Traffic Review Officer
                  </h3>
                  <p className="text-2xs text-muted">
                    Assigning under: {currentDivision.name} ({currentDivision.admin.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewOfficer} className="mt-5 space-y-4">
              {/* Full Name & Rank */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Insp. Tariq Mehmood"
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink placeholder-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Rank / Role *
                  </label>
                  <select
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="Inspector (Senior Audit Warden)">Inspector (Senior Audit Warden)</option>
                    <option value="Sub-Inspector">Sub-Inspector</option>
                    <option value="Senior Traffic Warden">Senior Traffic Warden</option>
                    <option value="Traffic Warden">Traffic Warden</option>
                    <option value="Inspector (Video Evidence Analyst)">Inspector (Evidence Analyst)</option>
                  </select>
                </div>
              </div>

              {/* Badge ID & Security PIN */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                      Badge ID *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateBadge}
                      className="text-2xs font-semibold text-accent hover:underline"
                    >
                      Auto Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. PTP-4482"
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 font-mono text-xs font-bold uppercase text-accent focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Access PIN (4 Digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="4-digit PIN"
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="officer@traffic.punjab.gov.pk"
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink placeholder-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Official Contact
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink placeholder-muted focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Assigned Sector & Shift */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Assigned Sector / Beat
                  </label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    {currentDivision.sectors.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                    <option value="General Highway Patrol">General Highway Patrol</option>
                    <option value="Central Junction Surveillance">Central Junction Surveillance</option>
                  </select>
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Shift Schedule
                  </label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="Morning (07:00 - 15:00)">Morning (07:00 - 15:00)</option>
                    <option value="Evening (15:00 - 23:00)">Evening (15:00 - 23:00)</option>
                    <option value="Night (23:00 - 07:00)">Night (23:00 - 07:00)</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                  Initial Status
                </label>
                <div className="mt-1 flex gap-3">
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="accent-accent"
                    />
                    <span>Active / On-Duty</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="on_leave"
                      checked={formStatus === 'on_leave'}
                      onChange={() => setFormStatus('on_leave')}
                      className="accent-accent"
                    />
                    <span>On Leave</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-edge pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-edge bg-canvas px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg border border-accent/60 bg-accent px-5 py-2 text-xs font-bold text-black shadow-glow-amber hover:bg-amber-400"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Enrol Officer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

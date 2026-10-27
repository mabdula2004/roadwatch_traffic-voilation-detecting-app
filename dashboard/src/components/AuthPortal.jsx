import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  Key,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  BadgeAlert,
  UserPlus,
  LogIn,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { DIVISIONS } from '../data/divisions';
import { authenticateUser, registerAdminAccount, registerOfficerAccount } from '../data/authStore';

export function AuthPortal({ onLoginSuccess }) {
  // Selected Portal: 'admin' | 'officer'
  const [activePortal, setActivePortal] = useState('officer'); // default to officer or admin
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Shared Form Fields
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [email, setEmail] = useState('');
  const [divisionId, setDivisionId] = useState('lahore_div');
  const [rank, setRank] = useState('Traffic Warden');
  const [sector, setSector] = useState('Mall Road & Civil Lines');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentDiv = DIVISIONS.find((d) => d.id === divisionId) || DIVISIONS[0];

  // Auto badge generator for officer registration
  const handleGenerateBadge = () => {
    const prefix = currentDiv.code === 'KHI' ? 'KTP' : 'PTP';
    const num = Math.floor(1000 + Math.random() * 9000);
    setBadge(`${prefix}-${num}`);
    if (!pin) setPin(String(num));
  };

  const handlePortalSwitch = (portal) => {
    setActivePortal(portal);
    setMode('login');
    setErrorMessage('');
    setIdentifier('');
    setPin('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const requiredRole = activePortal === 'admin' ? 'division_admin' : 'review_officer';
      const user = authenticateUser({
        identifier,
        pin,
        requiredRole,
      });

      onLoginSuccess(user);
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!name.trim() || !email.trim()) {
        throw new Error('Please fill in your full name and official email.');
      }

      const newAdmin = await registerAdminAccount({
        name,
        email,
        divisionId,
        pin: pin || '1234',
      });

      onLoginSuccess(newAdmin);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfficerRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!name.trim() || !email.trim() || !badge.trim()) {
        throw new Error('Please fill in officer name, badge ID, and email.');
      }

      const newOfficer = await registerOfficerAccount({
        name,
        badge,
        email,
        divisionId,
        rank,
        sector,
        pin: pin || '1234',
      });

      onLoginSuccess(newOfficer);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Fast Logins for testing
  const handleQuickLogin = (emailOrBadge, defaultPin, role) => {
    setErrorMessage('');
    try {
      const user = authenticateUser({
        identifier: emailOrBadge,
        pin: defaultPin,
        requiredRole: role,
      });
      onLoginSuccess(user);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const isAdminPortal = activePortal === 'admin';

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-canvas p-4 sm:p-6 overflow-y-auto thin-scroll">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-3xl transition-all duration-700 ${
            isAdminPortal ? 'bg-accent/15' : 'bg-telemetry/15'
          }`}
        />
        <div
          className={`absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full blur-3xl transition-all duration-700 ${
            isAdminPortal ? 'bg-amber-600/10' : 'bg-blue-600/10'
          }`}
        />
      </div>

      <div className="relative my-auto w-full max-w-xl rounded-3xl border border-edge bg-surface/90 shadow-2xl backdrop-blur-xl overflow-hidden animate-scaleUp">
        {/* Top Header Branding */}
        <div className="border-b border-edge bg-gradient-to-r from-surface via-canvas to-surface px-8 py-6">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                isAdminPortal
                  ? 'border-accent/40 bg-accent/15 text-accent shadow-glow-amber'
                  : 'border-telemetry/40 bg-telemetry/15 text-telemetry shadow-glow-cyan'
              }`}
            >
              {isAdminPortal ? <ShieldCheck className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-bold tracking-tight text-ink">
                  RoadWatch Enforcement Command
                </h1>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isAdminPortal
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-telemetry/15 text-telemetry border border-telemetry/30'
                  }`}
                >
                  {isAdminPortal ? 'ADMINISTRATIVE ACCESS' : 'WARDEN ACCESS'}
                </span>
              </div>
              <p className="text-2xs text-muted">
                Punjab & National Traffic Police Automated Enforcement Audit System
              </p>
            </div>
          </div>

          {/* Primary Portal Switcher: Admin Portal vs Officer Workstation */}
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-edge bg-canvas/70 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handlePortalSwitch('officer')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
                !isAdminPortal
                  ? 'bg-telemetry text-black font-bold shadow-glow-cyan'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Officer Workstation</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('admin')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
                isAdminPortal
                  ? 'bg-accent text-black font-bold shadow-glow-amber'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Division Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {/* Subheading & Mode Toggle */}
          <div className="flex items-center justify-between border-b border-edge/60 pb-4 mb-6">
            <div>
              <h2 className="text-sm font-bold text-ink">
                {isAdminPortal
                  ? mode === 'login'
                    ? 'Division Administrator Sign-In'
                    : 'Register as Division Administrator'
                  : mode === 'login'
                  ? 'Traffic Review Officer Sign-In'
                  : 'Register New Officer Badge'}
              </h2>
              <p className="text-2xs text-muted mt-0.5">
                {isAdminPortal
                  ? 'High-command portal: manage wardens and oversee division enforcement'
                  : 'Duty station portal: audit camera captures and verify citizen disputes'}
              </p>
            </div>

            {/* Login / Register Toggle */}
            <div className="flex items-center rounded-lg border border-edge bg-canvas/60 p-0.5 text-2xs">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                className={`rounded px-2.5 py-1 font-semibold transition ${
                  mode === 'login'
                    ? isAdminPortal
                      ? 'bg-accent/20 text-accent'
                      : 'bg-telemetry/20 text-telemetry'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                  if (!isAdminPortal) handleGenerateBadge();
                }}
                className={`rounded px-2.5 py-1 font-semibold transition ${
                  mode === 'register'
                    ? isAdminPortal
                      ? 'bg-accent/20 text-accent'
                      : 'bg-telemetry/20 text-telemetry'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-signal/40 bg-signal/15 p-3 text-xs text-signal animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* A. LOGIN FORM (Common for both Admin and Officer)         */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                  {isAdminPortal ? 'Admin Official Email or Badge ID' : 'Officer Email or Badge ID'}
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      isAdminPortal
                        ? 'e.g. sp.lahore@traffic.punjab.gov.pk or ADM-LHR-01'
                        : 'e.g. zeeshan.ali@traffic.punjab.gov.pk or PTP-3104'
                    }
                    className={`w-full rounded-xl border border-edge bg-canvas/80 py-2.5 pl-10 pr-3 text-xs text-ink placeholder-muted transition focus:outline-none ${
                      isAdminPortal ? 'focus:border-accent' : 'focus:border-telemetry'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Security Access PIN (4 Digits)
                  </label>
                  <span className="text-[10px] text-muted">Default Demo PIN: 1234 or Badge #</span>
                </div>
                <div className="relative mt-1">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="password"
                    required
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter security PIN (e.g. 1234)"
                    className={`w-full rounded-xl border border-edge bg-canvas/80 py-2.5 pl-10 pr-3 font-mono text-xs text-ink placeholder-muted transition focus:outline-none ${
                      isAdminPortal ? 'focus:border-accent' : 'focus:border-telemetry'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-black shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                  isAdminPortal
                    ? 'border border-accent/60 bg-gradient-to-r from-accent to-amber-600 shadow-glow-amber'
                    : 'border border-telemetry/60 bg-gradient-to-r from-telemetry to-blue-600 shadow-glow-cyan'
                }`}
              >
                <span>
                  {isAdminPortal ? 'Enter Division Admin Command' : 'Start Officer Review Shift'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* B. ADMIN REGISTRATION FORM                                */}
          {/* ========================================================= */}
          {mode === 'register' && isAdminPortal && (
            <form onSubmit={handleAdminRegisterSubmit} className="space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                  Superintendent / Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SP Traffic Kamran Shah"
                  className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                  Official Police Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.name@traffic.punjab.gov.pk"
                  className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Regional Division *
                  </label>
                  <select
                    value={divisionId}
                    onChange={(e) => setDivisionId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.shortName} ({d.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Set Security PIN (4 Digits) *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/60 bg-gradient-to-r from-accent to-amber-600 py-3 text-xs font-bold text-black shadow-glow-amber transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Create Division Admin Account</span>
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* C. OFFICER REGISTRATION FORM                              */}
          {/* ========================================================= */}
          {mode === 'register' && !isAdminPortal && (
            <form onSubmit={handleOfficerRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sub-Insp. Ali Raza"
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-telemetry focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                      Badge ID *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateBadge}
                      className="text-2xs font-semibold text-telemetry hover:underline"
                    >
                      Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. PTP-5521"
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 font-mono text-xs font-bold uppercase text-telemetry focus:border-telemetry focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                  Official Officer Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer.name@traffic.punjab.gov.pk"
                  className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-telemetry focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Assigned Division *
                  </label>
                  <select
                    value={divisionId}
                    onChange={(e) => {
                      setDivisionId(e.target.value);
                      const div = DIVISIONS.find((d) => d.id === e.target.value) || DIVISIONS[0];
                      setSector(div.sectors[0] || 'Mall Road');
                    }}
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-telemetry focus:outline-none"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.shortName} ({d.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Rank / Role *
                  </label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-telemetry focus:outline-none"
                  >
                    <option value="Inspector (Senior Audit Warden)">Inspector (Audit Warden)</option>
                    <option value="Sub-Inspector">Sub-Inspector</option>
                    <option value="Senior Traffic Warden">Senior Traffic Warden</option>
                    <option value="Traffic Warden">Traffic Warden</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Assigned Sector / Beat
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 text-xs text-ink focus:border-telemetry focus:outline-none"
                  >
                    {currentDiv.sectors.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                    Access PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="mt-1 w-full rounded-xl border border-edge bg-canvas/80 px-3 py-2 font-mono text-xs text-ink focus:border-telemetry focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-telemetry/60 bg-gradient-to-r from-telemetry to-blue-600 py-3 text-xs font-bold text-black shadow-glow-cyan transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register Review Officer Account</span>
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* D. FAST 1-CLICK DEMO SHORTCUTS                            */}
          {/* ========================================================= */}
          <div className="mt-6 rounded-2xl border border-edge bg-canvas/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
              ⚡ 1-Click Fast Testing Accounts:
            </span>

            {isAdminPortal ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin('sp.lahore@traffic.punjab.gov.pk', '1234', 'division_admin')
                  }
                  className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-2xs font-bold text-accent hover:bg-accent/25 transition"
                >
                  SP Traffic Farooq Malik (Lahore Admin)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin('ssp.rwp@traffic.punjab.gov.pk', '1234', 'division_admin')
                  }
                  className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-2xs font-medium text-muted hover:text-ink transition"
                >
                  SSP Asim Jahangir (Rawalpindi Admin)
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin('zeeshan.ali@traffic.punjab.gov.pk', '3104', 'review_officer')
                  }
                  className="rounded-lg border border-telemetry/40 bg-telemetry/15 px-3 py-1.5 text-2xs font-bold text-telemetry hover:bg-telemetry/25 transition"
                >
                  Sub-Insp. Zeeshan Ali (PTP-3104)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin('a.raheem@traffic.punjab.gov.pk', '2291', 'review_officer')
                  }
                  className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-2xs font-medium text-muted hover:text-ink transition"
                >
                  Insp. A. Raheem (PTP-2291)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogin('hamza.tariq@traffic.punjab.gov.pk', '4519', 'review_officer')
                  }
                  className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-2xs font-medium text-muted hover:text-ink transition"
                >
                  Warden Hamza Tariq (PTP-4519)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

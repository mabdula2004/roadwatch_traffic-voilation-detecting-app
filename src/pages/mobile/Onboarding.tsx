import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, ShieldCheckIcon, ShieldAlertIcon } from 'lucide-react';
import { OtpInput } from '../../components/mobile/OtpInput';
import { useScreenInit } from '../../useScreenInit.js';
import { useUserProfile } from '../../contexts/UserContext';

export const OTP_LENGTH = 6;

function formatCnic(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12, 13)].filter(Boolean);
  return parts.join('-');
}

function formatPakPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    const truncated = digits.slice(0, 11);
    if (truncated.length > 4) {
      return `${truncated.slice(0, 4)} ${truncated.slice(4)}`;
    }
    return truncated;
  } else {
    const truncated = digits.slice(0, 10);
    if (truncated.length > 3) {
      return `${truncated.slice(0, 3)} ${truncated.slice(3)}`;
    }
    return truncated;
  }
}

const cnicValid = (v: string) => v.replace(/\D/g, '').length === 13;
const emailValid = (v: string) => v.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const safetyPoints = [
'Never record while driving — the app locks the camera above 15 km/h',
'Your identity is never shown to the person you report',
'Evidence is sealed — only police and you ever see the outcome'];


const inputBase =
'tabular w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry';

function FieldLabel({ htmlFor, children, optional }: {htmlFor: string;children: string;optional?: boolean;}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink">
      {children}
      {optional && <span className="text-2xs font-medium text-muted">Optional</span>}
    </label>);

}

function StepHeading({ n, title, done }: {n: number;title: string;done: boolean;}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors duration-150 ease-out ${
        done ? 'border-valid/60 bg-valid/15 text-valid' : 'border-edge bg-surface text-muted'}`
        }>
        
        {done ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : n}
      </span>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
    </div>);

}

export function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useUserProfile();
  const screenInit = useScreenInit();
  const startStep: number = screenInit.onboardingStep ?? 1;

  const [name, setName] = useState('Ahmed Raza Khan');
  const [cnic, setCnic] = useState('35202-4417896-8');
  const [phone, setPhone] = useState('300 1234567');
  const [email, setEmail] = useState('ahmed@example.com');
  const [vehicle, setVehicle] = useState('LEA-4471');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('491028');
  const [resendIn, setResendIn] = useState(30);
  const [agreed, setAgreed] = useState(true);
  const [inView, setInView] = useState(startStep);

  const stepRefs = [useRef<HTMLElement>(null), useRef<HTMLElement>(null), useRef<HTMLElement>(null)];

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (startStep > 1) stepRefs[startStep - 1].current?.scrollIntoView({ block: 'start' });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setInView(Number((e.target as HTMLElement).dataset.step));
        });
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    stepRefs.forEach((r) => r.current && observer.observe(r.current));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
  const passwordValid = password.length >= 6 || (password.length === 0 && confirmPassword.length === 0);
  const passwordMatched = password.length >= 6 && password === confirmPassword;
  const identityDone = name.trim().length > 2 && cnicValid(cnic) && cleanPhone.length === 10 && emailValid(email);
  const verifyDone = otp.length === OTP_LENGTH;
  const ready = identityDone && verifyDone && agreed;
  const done = [identityDone, verifyDone, agreed];

  return (
    <div className="relative min-h-full">
      {/* Progress */}
      <div className="sticky top-0 z-20 bg-canvas/95 px-6 pb-3 pt-2 backdrop-blur">
        <div className="flex gap-1.5" role="progressbar" aria-label="Registration progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={done.filter(Boolean).length}>
          {done.map((d, i) =>
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-edge">
              <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: d ? '100%' : inView > i + 1 ? '100%' : inView === i + 1 ? '40%' : '0%' }} />
            
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-10">
        {/* Welcome */}
        <header className="flex flex-col items-center pt-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 text-accent shadow-glow-amber">
            <ShieldCheckIcon className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-[28px] font-bold leading-tight text-ink">RoadWatch</h1>
          <p className="mt-2 text-sm font-medium text-ink">Report traffic violations. Help make roads safer.</p>
          <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-muted">
            Three quick steps and you're ready to report, verified with NADRA.
          </p>
        </header>

        {/* Step 1 */}
        <section ref={stepRefs[0]} data-step="1" className="mt-14 scroll-mt-10" aria-labelledby="step-identity">
          <StepHeading n={1} title="Identity" done={identityDone} />
          <div className="mt-5 space-y-4" id="step-identity">
            <div>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As printed on your CNIC"
                autoComplete="name"
                className={`${inputBase} border-edge`} />
              
            </div>
            <div>
              <FieldLabel htmlFor="cnic">CNIC number</FieldLabel>
              <div className="relative">
                <input
                  id="cnic"
                  value={cnic}
                  onChange={(e) => setCnic(formatCnic(e.target.value))}
                  placeholder="XXXXX-XXXXXXX-X"
                  inputMode="numeric"
                  className={`${inputBase} pr-11 ${cnicValid(cnic) ? 'border-valid/60' : 'border-edge'}`} />
                
                {cnicValid(cnic) &&
                <CheckIcon
                  className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-valid"
                  aria-label="Valid CNIC" />

                }
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="phone">Phone number</FieldLabel>
              <div className="flex overflow-hidden rounded-xl border border-edge bg-surface transition-colors duration-150 ease-out focus-within:border-telemetry">
                <span className="tabular flex items-center border-r border-edge px-3.5 text-sm font-semibold text-muted">
                  +92
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPakPhone(e.target.value))}
                  placeholder="0300 1234567 or 300 1234567"
                  className="tabular w-full bg-transparent px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted/60" />
                
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="email" optional>
                Email
              </FieldLabel>
              <input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={`${inputBase} ${emailValid(email) ? 'border-edge' : 'border-signal/60'}`} />
              
            </div>
            <div>
              <FieldLabel htmlFor="vehicle" optional>
                Vehicle plate number
              </FieldLabel>
              <input
                id="vehicle"
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value.toUpperCase())}
                placeholder="e.g. LEA-4471"
                className={`${inputBase} border-edge font-display font-semibold tracking-wider placeholder:font-normal placeholder:tracking-normal`} />
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section ref={stepRefs[1]} data-step="2" className="mt-14 scroll-mt-10" aria-label="Verification">
          <StepHeading n={2} title="Verification" done={verifyDone} />
          <p className="mt-2 text-xs text-muted">
            Enter the {OTP_LENGTH}-digit code sent to{' '}
            <span className="tabular font-semibold text-ink">+92 {cleanPhone || '300 1234567'}</span>
          </p>
          <div className="mt-4">
            <OtpInput length={OTP_LENGTH} value={otp} onChange={setOtp} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={resendIn > 0}
              onClick={() => setResendIn(30)}
              className="font-semibold text-telemetry transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:text-muted/60">
              
              Resend code
            </button>
            {resendIn > 0 &&
            <span className="tabular text-muted">0:{String(resendIn).padStart(2, '0')}</span>
            }
          </div>
          <p className="mt-4 text-2xs leading-relaxed text-muted">
            Verifying your CNIC and phone keeps one account per person.
          </p>
        </section>

        {/* Step 3 */}
        <section ref={stepRefs[2]} data-step="3" className="mt-14 scroll-mt-10" aria-label="Safety disclaimer">
          <StepHeading n={3} title="Safety" done={agreed} />
          <div className="mt-5 rounded-2xl border border-accent/50 bg-surface p-5">
            <ShieldAlertIcon className="h-6 w-6 text-accent" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-bold text-ink">Before you start reporting</h3>
            <ul className="mt-3 space-y-2.5">
              {safetyPoints.map((p) =>
              <li key={p} className="flex gap-2.5 text-xs leading-relaxed text-ink">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {p}
                </li>
              )}
            </ul>

            <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-edge pt-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="peer sr-only" />
              
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-telemetry/70 ${
                agreed ? 'border-accent bg-accent text-canvas' : 'border-edge bg-canvas'}`
                }
                aria-hidden="true">
                
                {agreed && <CheckIcon className="h-3.5 w-3.5" />}
              </span>
              <span className="text-xs font-semibold text-ink">I understand and agree to report safely</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              updateProfile({
                name: name.trim() || 'Ahmed Raza Khan',
                phone: phone.trim() ? (phone.startsWith('+92') ? phone : `+92 ${phone}`) : '+92 300 1234567',
                email: email.trim() || 'ahmed@example.com',
                cnic: cnic.trim() || '35202-4417896-8',
                plate: vehicle.trim() || 'LEA-4471',
              });
              navigate('/capture');
            }}
            className="mt-5 w-full rounded-2xl bg-accent px-4 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-[transform,opacity] duration-150 ease-out active:scale-[0.98]">
            Create account
          </button>
        </section>

        <footer className="mt-10 text-center text-2xs leading-relaxed text-muted">
          By continuing you agree to the{' '}
          <a href="#terms" className="font-semibold text-ink underline decoration-edge underline-offset-2 hover:text-telemetry">
            Terms
          </a>{' '}
          &amp;{' '}
          <a href="#privacy" className="font-semibold text-ink underline decoration-edge underline-offset-2 hover:text-telemetry">
            Privacy Policy
          </a>
          .
        </footer>
      </div>
    </div>);

}
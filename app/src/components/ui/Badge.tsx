import React from 'react';

type Tone = 'neutral' | 'telemetry' | 'valid' | 'danger' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface/80 text-muted border-edge',
  telemetry: 'bg-telemetry/10 text-telemetry border-telemetry/40',
  valid: 'bg-valid/10 text-valid border-valid/40',
  danger: 'bg-signal/10 text-signal border-signal/40',
  accent: 'bg-accent/10 text-accent border-accent/40'
};

const glows: Record<Tone, string> = {
  neutral: '',
  telemetry: 'shadow-glow-cyan',
  valid: 'shadow-glow-green',
  danger: 'shadow-glow-red',
  accent: 'shadow-glow-amber'
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  glow?: boolean;
  className?: string;
}

export function Badge({ children, tone = 'neutral', glow = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold tracking-wide ${tones[tone]} ${
      glow ? glows[tone] : ''} ${
      className}`}>
      
      {children}
    </span>);

}
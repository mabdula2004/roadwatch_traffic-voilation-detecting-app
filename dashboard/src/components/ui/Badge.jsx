import React from 'react';

const toneClasses = {
  valid: 'bg-valid/15 text-valid border-valid/30',
  danger: 'bg-signal/15 text-signal border-signal/30',
  telemetry: 'bg-telemetry/15 text-telemetry border-telemetry/30',
  accent: 'bg-accent/15 text-accent border-accent/30',
  neutral: 'bg-surface text-muted border-edge',
};

export function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-bold tracking-wide uppercase tabular ${toneClasses[tone] || toneClasses.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

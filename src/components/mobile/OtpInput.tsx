import React, { useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="One-time code">
      {digits.map((d, i) =>
      <input
        key={i}
        ref={(el) => {
          refs.current[i] = el;
        }}
        value={d}
        inputMode="numeric"
        autoComplete={i === 0 ? 'one-time-code' : 'off'}
        maxLength={1}
        aria-label={`Digit ${i + 1}`}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '');
          if (v.length > 1) {
            onChange(v.slice(0, length));
            refs.current[Math.min(v.length, length) - 1]?.focus();
            return;
          }
          setAt(i, v);
          if (v && i < length - 1) refs.current[i + 1]?.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
        }}
        className={`tabular h-12 w-full min-w-0 rounded-xl border bg-surface text-center font-display text-lg font-bold text-ink outline-none transition-colors duration-150 ease-out focus:border-telemetry ${
        d ? 'border-telemetry/60' : 'border-edge'}`
        } />

      )}
    </div>);

}
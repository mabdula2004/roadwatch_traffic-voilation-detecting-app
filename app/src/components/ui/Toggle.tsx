import React from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function Toggle({ id, checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-telemetry disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'bg-telemetry shadow-glow-cyan'
          : 'border border-edge bg-surface'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md transition-transform duration-200 ease-in-out ${
          checked
            ? 'translate-x-5 bg-white'
            : 'translate-x-0 bg-muted/80'
        }`}
      />
    </button>
  );
}
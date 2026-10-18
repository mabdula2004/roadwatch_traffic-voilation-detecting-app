import React from 'react';

interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, color = '#38BDF8', className = '', label }: ProgressBarProps) {
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-edge ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}>
      
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: color }} />
      
    </div>);

}
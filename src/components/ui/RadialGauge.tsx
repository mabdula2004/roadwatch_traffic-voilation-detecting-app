import React from 'react';

interface RadialGaugeProps {
  value: number;
  max?: number;
  size?: number;
  label: string;
  caption?: string;
  color?: string;
}

export function RadialGauge({
  value,
  max = 100,
  size = 148,
  label,
  caption,
  color = '#10B981'
}: RadialGaugeProps) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${value} of ${max}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgb(var(--color-edge))" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
          
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold tabular text-ink">{value}</span>
          <span className="text-2xs font-medium text-muted">/ {max}</span>
        </div>
      </div>
      {caption && <p className="mt-2 text-xs font-semibold" style={{ color }}>{caption}</p>}
    </div>);

}
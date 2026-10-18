import React from 'react';

const bars = Array.from({ length: 84 }, (_, i) => {
  const base = Math.abs(Math.sin(i * 0.42)) * 0.6 + 0.15;
  const siren = i > 44 && i < 62 ? 0.95 : 0;
  return Math.min(Math.max(base, siren), 1);
});

interface WaveformProps {
  sirenDetected: boolean;
  playheadPct?: number;
}

export function Waveform({ sirenDetected, playheadPct = 46 }: WaveformProps) {
  return (
    <div className="relative">
      <div className="flex h-14 items-center gap-[2px]" aria-hidden="true">
        {bars.map((h, i) => {
          const inSiren = sirenDetected && i > 44 && i < 62;
          return (
            <span
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${h * 100}%`,
                backgroundColor: inSiren ? '#EF4444' : i / bars.length <= playheadPct / 100 ? '#38BDF8' : '#334155',
                opacity: inSiren ? 0.95 : 0.85
              }} />);


        })}
      </div>
      <div
        className="absolute inset-y-0 w-px bg-accent"
        style={{ left: `${playheadPct}%`, boxShadow: '0 0 8px #F59E0B' }}
        aria-hidden="true" />
      
      {sirenDetected &&
      <span className="absolute -top-1 left-[54%] rounded bg-signal px-1.5 py-0.5 text-[9px] font-bold text-white">
          SIREN 00:06–00:09
        </span>
      }
    </div>);

}
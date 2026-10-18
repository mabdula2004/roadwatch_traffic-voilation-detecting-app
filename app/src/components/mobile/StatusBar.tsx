import React from 'react';
import { SignalIcon, WifiIcon, BatteryFullIcon } from 'lucide-react';

export function StatusBar() {
  return (
    <div className="z-30 flex h-9 shrink-0 items-center justify-between bg-canvas px-6 pt-1 text-2xs font-semibold text-ink">
      <span className="tabular">19:42</span>
      <div className="flex items-center gap-1.5 text-muted">
        <SignalIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <WifiIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <BatteryFullIcon className="h-4 w-4" aria-hidden="true" />
      </div>
    </div>);

}
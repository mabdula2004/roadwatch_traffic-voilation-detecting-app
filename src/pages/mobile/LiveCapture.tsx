import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  ScanLineIcon,
  VideoIcon,
  SwitchCameraIcon } from
'lucide-react';
import { media } from '../../data/media';

interface LiveCaptureProps {
  speedLockActive?: boolean;
}

export function LiveCapture({ speedLockActive = false }: LiveCaptureProps) {
  const navigate = useNavigate();
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  return (
    <div className="relative h-full min-h-[700px] w-full overflow-hidden bg-black">
      <img
        src={media.viewfinder}
        alt="Live camera viewfinder showing the road ahead"
        className="absolute inset-0 h-full w-full object-cover" />
      
      <div className="absolute inset-0 bg-canvas/25" />

      {/* Telemetry HUD */}
      <div className="absolute inset-x-0 top-0 p-4">
        <div className="flex items-start justify-end gap-2">
          <div className="glass rounded-xl px-3 py-1.5 text-right shadow-glow-cyan">
            <p className="tabular text-2xs font-bold text-ink">19:42:08</p>
            <p className="text-[10px] text-muted">17 Sep 2026</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <MapPinIcon className="h-3 w-3 text-telemetry" aria-hidden="true" />
            <span className="tabular text-[10px] font-semibold text-ink">31.5204° N, 74.3587° E</span>
          </div>
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-valid" />
            <span className="text-[10px] font-semibold text-muted">GPS ±4m</span>
          </div>
        </div>
      </div>

      {/* Plate detection scan pill + reticle */}
      <div className="absolute left-1/2 top-[38%] w-[62%] -translate-x-1/2">
        <motion.div
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="relative aspect-[16/7] rounded-lg border border-telemetry/70 shadow-glow-cyan">
          
          <span className="absolute -top-2 left-2 rounded bg-canvas px-1.5 text-[9px] font-bold text-telemetry">
            PLATE ROI
          </span>
        </motion.div>
        <div className="mt-3 flex justify-center">
          <div className="glass inline-flex items-center gap-2 rounded-full border-telemetry/50 px-3.5 py-2 shadow-glow-cyan">
            <ScanLineIcon className="h-3.5 w-3.5 text-telemetry" aria-hidden="true" />
            <span className="text-2xs font-bold tracking-wide text-telemetry">
              PLATE DETECTION · SCANNING
            </span>
          </div>
        </div>
      </div>

      {/* Shutter row */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center px-8 pb-[110px]">
        <button
          type="button"
          onClick={() => navigate('/review')}
          aria-label="Capture violation report"
          className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-accent/60 bg-accent shadow-glow-amber transition-transform duration-150 ease-out active:scale-95">
          <VideoIcon className="h-7 w-7 text-canvas" aria-hidden="true" />
        </button>
      </div>
    </div>);
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SirenIcon, PhoneIcon, EyeOffIcon, SearchIcon, ChevronRightIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Toggle } from '../../components/ui/Toggle';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';

export function SafetySettings() {
  const { push } = useToast();
  const { t } = useLanguage();
  const [blurFaces, setBlurFaces] = useState(true);

  return (
    <div className="min-h-full px-4 pb-28 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            {t('safetyAndPrivacy')}
          </h1>
          <p className="mt-1 text-xs text-muted">Emergency help and what RoadWatch shares about you.</p>
        </div>
      </div>

      {/* SOS */}
      <section className="mt-5" aria-label="Emergency SOS">
        <button
          type="button"
          onClick={() => push('SOS sent to Rescue 1122', 'Live location and last 30s of video shared.', 'danger')}
          className="flex w-full flex-col items-center gap-2 rounded-2xl bg-signal px-4 py-7 shadow-glow-red transition-transform duration-150 ease-out active:scale-[0.98]">
          
          <SirenIcon className="h-9 w-9 text-white" aria-hidden="true" />
          <span className="font-display text-lg font-extrabold tracking-wide text-white">EMERGENCY SOS</span>
          <span className="text-2xs font-semibold text-white/90">
            Hold to alert Rescue 1122 &amp; share live location.
          </span>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {['Police 15', 'Rescue 1122'].map((label) =>
          <button
            key={label}
            type="button"
            className="flex items-center justify-center gap-2 rounded-full border border-edge bg-surface px-3 py-3 text-xs font-semibold text-ink transition-colors duration-150 ease-out hover:border-signal/50">
            
              <PhoneIcon className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
              {label}
            </button>
          )}
        </div>
      </section>

      {/* Privacy shield */}
      <h2 className="mt-7 text-[10px] font-bold uppercase tracking-wider text-muted">Privacy shields</h2>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-edge bg-surface px-4 py-3.5">
        <EyeOffIcon className="h-4 w-4 shrink-0 text-telemetry" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink">Auto-blur faces</p>
          <p className="mt-0.5 text-2xs leading-snug text-muted">
            Every detected face is blurred on-device before upload.
          </p>
        </div>
        <Toggle id="blur-faces" label="Auto-blur faces" checked={blurFaces} onChange={setBlurFaces} />
      </div>

      {/* Plate search */}
      <Link
        to="/search"
        className="mt-7 flex items-center gap-3 rounded-2xl border border-edge bg-surface px-4 py-3.5 transition-colors duration-150 ease-out hover:border-telemetry/40">
        
        <SearchIcon className="h-4 w-4 text-telemetry" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink">Public plate search</p>
          <p className="mt-0.5 text-2xs text-muted">Verify a vehicle is cleared before buying it.</p>
        </div>
        <ChevronRightIcon className="h-4 w-4 text-muted" aria-hidden="true" />
      </Link>
    </div>);

}
import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';

interface OptionSheetProps<T extends string> {
  open: boolean;
  title: string;
  options: {value: T;label: string;}[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}

export function OptionSheet<T extends string>({
  open,
  title,
  options,
  value,
  onSelect,
  onClose
}: OptionSheetProps<T>) {
  const target = typeof document !== 'undefined' ? document.getElementById('mobile-overlay-root') : null;
  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col justify-end">
          <motion.button
          type="button"
          aria-label="Close"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0 bg-black/60" />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          className="relative rounded-t-3xl border-t border-edge bg-surface px-4 pb-8 pt-3">
          
            <div className="mx-auto h-1 w-10 rounded-full bg-edge" aria-hidden="true" />
            <h2 className="mt-4 px-2 font-display text-base font-bold text-ink">{title}</h2>
            <ul className="mt-3 divide-y divide-edge rounded-2xl border border-edge bg-canvas">
              {options.map((o) =>
            <li key={o.value}>
                  <button
                type="button"
                onClick={() => {
                  onSelect(o.value);
                  onClose();
                }}
                aria-pressed={o.value === value}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-ink">
                
                    {o.label}
                    {o.value === value && <CheckIcon className="h-4 w-4 text-accent" aria-hidden="true" />}
                  </button>
                </li>
            )}
            </ul>
          </motion.div>
        </div>
      }
    </AnimatePresence>,
    target
  );
}
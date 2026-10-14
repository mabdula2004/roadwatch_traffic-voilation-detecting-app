import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2Icon, AlertTriangleIcon, InfoIcon } from 'lucide-react';

type ToastTone = 'success' | 'danger' | 'info';

interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (title: string, detail?: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

const toneStyles: Record<ToastTone, {ring: string;color: string;Icon: typeof CheckCircle2Icon;}> = {
  success: { ring: 'border-valid/50 shadow-glow-green', color: 'text-valid', Icon: CheckCircle2Icon },
  danger: { ring: 'border-signal/50 shadow-glow-red', color: 'text-signal', Icon: AlertTriangleIcon },
  info: { ring: 'border-telemetry/50 shadow-glow-cyan', color: 'text-telemetry', Icon: InfoIcon }
};

export function ToastProvider({ children }: {children: React.ReactNode;}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((title: string, detail?: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, detail, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 top-11 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map(({ id, title, detail, tone }) => {
            const { ring, color, Icon } = toneStyles[tone];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                role="status"
                className={`glass flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 ${ring}`}>
                
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-ink">{title}</p>
                  {detail && <p className="mt-0.5 text-2xs leading-snug text-muted">{detail}</p>}
                </div>
              </motion.div>);

          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>);

}
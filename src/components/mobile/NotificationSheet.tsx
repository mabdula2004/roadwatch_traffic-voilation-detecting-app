import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  XIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  ClockIcon,
  BellIcon
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'success' | 'info';
  unread?: boolean;
}

const defaultNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Dispute Deadline Warning',
    message: 'Challan CH-88421 (LEA-4471) has only 14 hours left to dispute before fine is finalized.',
    time: '2h ago',
    type: 'alert',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'Reward Credited: PKR 300',
    message: 'Report RW-30219 approved by Punjab Traffic Police. Funds added to your wallet balance.',
    time: 'Yesterday',
    type: 'success',
    unread: true,
  },
  {
    id: 'notif-3',
    title: 'NADRA Citizen Verification',
    message: 'CNIC 35202-4417896-8 verified. Reporter score upgraded to High Trust tier.',
    time: '3 days ago',
    type: 'info',
    unread: false,
  },
  {
    id: 'notif-4',
    title: 'Safety Shield Active',
    message: 'Automatic face and bystander plate blurring enabled on camera stream.',
    time: '5 days ago',
    type: 'info',
    unread: false,
  },
];

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSheet({ open, onClose }: NotificationSheetProps) {
  const target = typeof document !== 'undefined' ? document.getElementById('mobile-overlay-root') : null;
  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col justify-end">
          <motion.button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/60"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications & Alerts"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            className="relative max-h-[82vh] flex flex-col rounded-t-3xl border-t border-edge bg-surface px-4 pb-8 pt-3"
          >
            <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-edge" aria-hidden="true" />

            <div className="mt-4 flex shrink-0 items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <BellIcon className="h-4 w-4 text-telemetry" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-ink">Notifications &amp; Alerts</h2>
                <Badge tone="accent">2 new</Badge>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge bg-canvas text-muted transition-colors hover:text-ink"
              >
                <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="thin-scroll mt-4 space-y-2.5 overflow-y-auto pr-0.5">
              {defaultNotifications.map((n) => {
                const isAlert = n.type === 'alert';
                const isSuccess = n.type === 'success';

                return (
                  <div
                    key={n.id}
                    className={`relative rounded-2xl border p-3.5 transition-colors duration-150 ease-out ${
                      isAlert
                        ? 'border-signal/40 bg-signal/5'
                        : isSuccess
                        ? 'border-valid/40 bg-valid/5'
                        : 'border-edge bg-canvas'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isAlert
                            ? 'bg-signal/15 text-signal shadow-glow-red'
                            : isSuccess
                            ? 'bg-valid/15 text-valid shadow-glow-green'
                            : 'bg-telemetry/15 text-telemetry shadow-glow-cyan'
                        }`}
                      >
                        {isAlert ? (
                          <AlertTriangleIcon className="h-4 w-4" aria-hidden="true" />
                        ) : isSuccess ? (
                          <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-xs font-bold text-ink">{n.title}</p>
                          <span className="tabular shrink-0 text-[10px] text-muted">{n.time}</span>
                        </div>
                        <p className="mt-1 text-2xs leading-relaxed text-muted">{n.message}</p>
                      </div>

                      {n.unread && (
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            isAlert ? 'bg-signal' : 'bg-telemetry'
                          }`}
                          aria-label="Unread"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    target
  );
}

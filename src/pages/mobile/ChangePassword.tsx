import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, KeyRoundIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';

export function ChangePassword() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      push('Current password required', 'Please type your existing password.', 'danger');
      return;
    }
    if (newPassword.length < 6) {
      push('Password too short', 'New password must be at least 6 characters.', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      push('Passwords do not match', 'The new passwords you entered do not match.', 'danger');
      return;
    }

    push('Password changed', 'Your account credentials have been updated securely.', 'success');
    navigate('/settings');
  };

  const isMatched = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-full pb-28">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-edge bg-canvas/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink">
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          {t('backToSettings')}
        </button>
        <span className="font-display text-sm font-bold text-ink">{t('changePassword')}</span>
        <div className="w-10" />
      </header>

      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-glow-amber">
            <KeyRoundIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-sm font-bold text-ink">{t('updateSecurityCredentials')}</h1>
            <p className="mt-0.5 text-2xs text-muted">Choose a strong, unique password to secure your reports.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Current Password */}
          <div>
            <label htmlFor="current-pw" className="mb-1.5 block text-xs font-semibold text-ink">
              {t('currentPassword')}
            </label>
            <div className="relative">
              <input
                id="current-pw"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="tabular w-full rounded-xl border border-edge bg-surface px-3.5 py-3 pr-11 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink">
                {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new-pw" className="mb-1.5 block text-xs font-semibold text-ink">
              {t('newPassword')}
            </label>
            <div className="relative">
              <input
                id="new-pw"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="tabular w-full rounded-xl border border-edge bg-surface px-3.5 py-3 pr-11 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink">
                {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label htmlFor="confirm-pw" className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink">
              <span>{t('confirmNewPassword')}</span>
              {isMatched && (
                <span className="flex items-center gap-1 text-2xs font-medium text-valid">
                  <CheckCircle2Icon className="h-3 w-3" /> Passwords match
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="confirm-pw"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`tabular w-full rounded-xl border bg-surface px-3.5 py-3 pr-11 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry ${
                  isMatched ? 'border-valid/60' : 'border-edge'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink">
                {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="pt-1 text-2xs text-muted">
            Password must be minimum 6 characters. You will stay signed in on this device.
          </p>

          {/* Submit */}
          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98]">
            <KeyRoundIcon className="h-4 w-4" aria-hidden="true" />
            {t('updatePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}

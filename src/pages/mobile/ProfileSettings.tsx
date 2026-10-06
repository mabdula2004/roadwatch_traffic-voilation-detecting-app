import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, UserIcon, PhoneIcon, MailIcon, ShieldCheckIcon, CarIcon, SaveIcon } from 'lucide-react';
import { useUserProfile } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Badge } from '../../components/ui/Badge';

export function ProfileSettings() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();
  const { push } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [plate, setPlate] = useState(profile.plate || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      push('Name required', 'Please provide a valid full name.', 'danger');
      return;
    }
    updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      plate: plate.trim() || 'LEA-4471'
    });
    push('Profile updated', 'Your personal details and vehicle have been updated.', 'success');
    navigate('/settings');
  };

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'AK';

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
        <span className="font-display text-sm font-bold text-ink">{t('editProfile')}</span>
        <div className="w-10" />
      </header>

      <form onSubmit={handleSave} className="px-4 pt-6">
        {/* Avatar banner */}
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-telemetry/40 bg-telemetry/15 font-display text-2xl font-bold text-telemetry shadow-glow-cyan">
            {initials}
          </div>
          <p className="mt-3 font-display text-base font-bold text-ink">{name || 'Your Name'}</p>
          <p className="tabular mt-0.5 text-xs text-muted">CNIC {profile.cnic}</p>
        </div>

        {/* Changeable Fields */}
        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink">
              <UserIcon className="h-3.5 w-3.5 text-telemetry" aria-hidden="true" />
              {t('fullName')}
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As printed on CNIC"
              className="tabular w-full rounded-xl border border-edge bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink">
              <PhoneIcon className="h-3.5 w-3.5 text-telemetry" aria-hidden="true" />
              {t('phoneNumber')}
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
              className="tabular w-full rounded-xl border border-edge bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink">
              <MailIcon className="h-3.5 w-3.5 text-telemetry" aria-hidden="true" />
              {t('emailAddress')}
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="tabular w-full rounded-xl border border-edge bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry"
            />
          </div>

          <div>
            <label htmlFor="profile-vehicle" className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink">
              <span className="flex items-center gap-2">
                <CarIcon className="h-3.5 w-3.5 text-telemetry" aria-hidden="true" />
                {t('vehicleNumberPlate')}
              </span>
              <span className="text-2xs font-medium text-muted">{t('optional')}</span>
            </label>
            <input
              id="profile-vehicle"
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="e.g. LEA-4471"
              className="tabular w-full rounded-xl border border-edge bg-surface px-3.5 py-3 font-display text-sm font-semibold tracking-wider text-ink outline-none transition-colors duration-150 ease-out placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/60 focus:border-telemetry"
            />
          </div>
        </div>

        {/* Readonly Identity & Vehicle Information */}
        <div className="mt-6 rounded-2xl border border-edge bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Government Verified Identity</p>
          <div className="mt-3 flex items-center justify-between border-b border-edge pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-valid" aria-hidden="true" />
              <div>
                <p className="text-2xs text-muted">National CNIC</p>
                <p className="tabular font-display text-sm font-semibold text-ink">{profile.cnic}</p>
              </div>
            </div>
            <Badge tone="valid">NADRA Verified</Badge>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CarIcon className="h-4 w-4 text-telemetry" aria-hidden="true" />
              <div>
                <p className="text-2xs text-muted">Registered Vehicle</p>
                <p className="tabular font-display text-sm font-semibold text-ink">{profile.plate}</p>
              </div>
            </div>
            <Badge tone="neutral">Punjab Excise</Badge>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98]">
          <SaveIcon className="h-4 w-4" aria-hidden="true" />
          {t('saveChanges')}
        </button>
      </form>
    </div>
  );
}

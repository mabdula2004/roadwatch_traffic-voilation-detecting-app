import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  KeyRoundIcon,
  LanguagesIcon,
  MoonIcon,
  BellIcon,
  HelpCircleIcon,
  FileTextIcon,
  InfoIcon,
  ChevronRightIcon,
  LogOutIcon,
  TrendingUpIcon
} from
  'lucide-react';
import { RadialGauge } from '../../components/ui/RadialGauge';
import { OptionSheet } from '../../components/mobile/OptionSheet';
import { NotificationSheet } from '../../components/mobile/NotificationSheet';
import { useUserProfile } from '../../contexts/UserContext';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { useLanguage, type Language } from '../../contexts/LanguageContext';

const languageOptions: { value: Language; label: string; }[] = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو (Urdu)' }];

const themeOptions: { value: Theme; label: string; }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' }];


function Section({ title, children }: { title: string; children: React.ReactNode; }) {
  return (
    <section className="mt-6">
      <h2 className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted">{title}</h2>
      <ul className="mt-2 divide-y divide-edge rounded-2xl border border-edge bg-surface">{children}</ul>
    </section>);

}

interface RowProps {
  Icon: typeof UserIcon;
  title: string;
  caption?: string;
  value?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}

function Row({ Icon, title, caption, value, onClick, trailing }: RowProps) {
  const content =
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {caption && <p className="mt-0.5 text-2xs leading-snug text-muted">{caption}</p>}
      </div>
      {value && <span className="shrink-0 text-xs text-muted">{value}</span>}
      {trailing ?? (onClick && <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />)}
    </>;


  return (
    <li>
      {onClick ?
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-canvas/40">

          {content}
        </button> :

        <div className="flex items-start gap-3 px-4 py-3.5">{content}</div>
      }
    </li>);

}

export function Settings() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, isUrdu } = useLanguage();
  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const langOptions: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'اردو (Urdu)' }
  ];

  const currentThemeOptions: { value: Theme; label: string }[] = [
    { value: 'dark', label: t('dark') },
    { value: 'light', label: t('light') },
    { value: 'system', label: t('system') }
  ];

  return (
    <div className="min-h-full px-4 pb-28 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{profile.name}</h1>
          <p className="tabular mt-0.5 text-xs text-muted">CNIC {profile.cnic} · {profile.plate}</p>
        </div>
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          aria-label={t('notificationsAlerts')}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface text-muted transition-colors duration-150 ease-out hover:border-telemetry/40 hover:text-telemetry">
          <BellIcon className="h-4 w-4" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
          </span>
        </button>
      </div>

      {/* Hero trust score */}
      <section className="mt-4 rounded-2xl border border-edge bg-surface p-5">
        <div className="flex items-center gap-5">
          <RadialGauge value={94} label={t('trustScore')} caption={t('highTrust')} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('reporterTrust')}</p>
            <p className="mt-1 font-display text-lg font-bold leading-tight text-ink">
              {t('priorityReviewLane')}
            </p>
            <p className="mt-1.5 text-2xs leading-snug text-muted">
              {t('trustNotice')}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-2xs font-semibold text-valid">
              <TrendingUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t('thisMonth')}
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-edge pt-3.5">
          {[
            { label: t('approved'), value: '31' },
            { label: t('rejected'), value: '2' },
            { label: t('accuracy'), value: '94%' },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-[10px] uppercase tracking-wider text-muted">{s.label}</dt>
              <dd className="tabular mt-0.5 font-display text-base font-bold text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Section title={t('account')}>
        <Row
          Icon={UserIcon}
          title={t('profile')}
          caption={isUrdu ? `${profile.name}، ${profile.phone}` : `${profile.name}, ${profile.phone}`}
          onClick={() => navigate('/settings/profile')} />

        <Row
          Icon={KeyRoundIcon}
          title={t('changePassword')}
          caption={t('updateSecurityCredentials')}
          onClick={() => navigate('/settings/password')} />
      </Section>

      <Section title={t('preferences')}>
        <Row
          Icon={LanguagesIcon}
          title={t('language')}
          value={language === 'ur' ? 'اردو' : 'English'}
          onClick={() => setSheet('language')} />

        <Row
          Icon={MoonIcon}
          title={t('theme')}
          value={currentThemeOptions.find((o) => o.value === theme)?.label}
          onClick={() => setSheet('theme')} />
      </Section>

      <Section title={t('supportLegal')}>
        <Row Icon={HelpCircleIcon} title={t('helpFaq')} onClick={() => undefined} />
        <Row Icon={FileTextIcon} title={t('termsPrivacy')} onClick={() => undefined} />
        <Row Icon={InfoIcon} title={t('appVersion')} value="2.4.0 (318)" />
      </Section>

      {/* Account actions */}
      <div className="mt-10 border-t border-edge pt-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-edge bg-surface px-4 py-3.5 text-sm font-semibold text-ink transition-colors duration-150 ease-out hover:bg-edge/40">
          <LogOutIcon className="h-4 w-4" aria-hidden="true" />
          {t('logout')}
        </button>
        <button
          type="button"
          className="mx-auto mt-8 block text-sm font-semibold text-signal transition-opacity duration-150 ease-out hover:opacity-80">
          {t('deleteAccount')}
        </button>
      </div>

      <OptionSheet
        open={sheet === 'language'}
        title={t('language')}
        options={langOptions}
        value={language}
        onSelect={(l) => {
          setLanguage(l);
          setSheet(null);
        }}
        onClose={() => setSheet(null)} />

      <OptionSheet
        open={sheet === 'theme'}
        title={t('theme')}
        options={currentThemeOptions}
        value={theme}
        onSelect={(th) => {
          setTheme(th);
          setSheet(null);
        }}
        onClose={() => setSheet(null)} />

      <NotificationSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)} />

    </div>);

}
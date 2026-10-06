import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CameraIcon, LockIcon, SettingsIcon, CreditCardIcon, ShieldIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  const items = [
    { to: '/wallet', label: t('wallet'), Icon: CreditCardIcon, match: ['/wallet'] },
    { to: '/vault', label: t('vault'), Icon: LockIcon, match: ['/vault', '/review'] },
    { to: '/capture', label: t('capture'), Icon: CameraIcon, match: ['/capture'] },
    { to: '/safety', label: t('safety'), Icon: ShieldIcon, match: ['/safety', '/search'] },
    { to: '/settings', label: t('settings'), Icon: SettingsIcon, match: ['/settings'] },
  ];

  return (
    <nav
      aria-label="Primary"
      className="absolute inset-x-0 bottom-0 z-40 border-t border-edge bg-surface/95 backdrop-blur-md">
      
      <ul className="flex items-stretch">
        {items.map(({ to, label, Icon, match }) => {
          const active = match.some((m) => pathname.startsWith(m));
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 px-1 pb-5 pt-3 outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-telemetry/70">
                
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-150 ease-out ${
                  active ? 'bg-telemetry/15 text-telemetry shadow-glow-cyan' : 'text-muted'}`
                  }>
                  
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className={`text-[10px] font-semibold ${active ? 'text-telemetry' : 'text-muted'}`}>
                  {label}
                </span>
              </NavLink>
            </li>);

        })}
      </ul>
    </nav>);

}
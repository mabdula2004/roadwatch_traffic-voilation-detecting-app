import React from 'react';
import { Link } from 'react-router-dom';
import {
  InboxIcon,
  GavelIcon,
  ShieldAlertIcon,
  CheckCircle2Icon,
  UsersIcon,
  MapIcon,
  TruckIcon,
  StoreIcon,
  ShieldCheckIcon,
  SmartphoneIcon } from
'lucide-react';

export type CommandTab =
'Pending Queue' |
'Disputed Cases' |
'Fraud Alerts' |
'Approved Today' |
'Reporter Registry';

const tabs: {
  key: CommandTab;
  Icon: typeof InboxIcon;
  badge?: string;
  badgeClass?: string;
}[] = [
{ key: 'Pending Queue', Icon: InboxIcon, badge: '148', badgeClass: 'bg-accent/15 text-accent border-accent/40' },
{
  key: 'Disputed Cases',
  Icon: GavelIcon,
  badge: '21',
  badgeClass: 'bg-telemetry/15 text-telemetry border-telemetry/40'
},
{ key: 'Fraud Alerts', Icon: ShieldAlertIcon, badge: '6', badgeClass: 'bg-signal/15 text-signal border-signal/40' },
{ key: 'Approved Today', Icon: CheckCircle2Icon },
{ key: 'Reporter Registry', Icon: UsersIcon }];


const portals = [
{ to: '/command/map', label: 'Geofence Map', Icon: MapIcon },
{ to: '/command/fleet', label: 'Fleet Manager', Icon: TruckIcon },
{ to: '/kiosk', label: 'E-Sahulat Kiosk', Icon: StoreIcon }];


interface CommandSidebarProps {
  active: CommandTab;
  onSelect: (tab: CommandTab) => void;
}

export function CommandSidebar({ active, onSelect }: CommandSidebarProps) {
  return (
    <aside className="flex w-[268px] shrink-0 flex-col border-r border-edge bg-canvas">
      <div className="border-b border-edge px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
            <ShieldCheckIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-ink">RoadWatch Command</p>
            <p className="text-2xs text-muted">Punjab Traffic Police HQ</p>
          </div>
        </div>
      </div>

      <nav aria-label="Case queues" className="px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Case queues</p>
        <ul className="space-y-0.5">
          {tabs.map(({ key, Icon, badge, badgeClass }) => {
            const isActive = active === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSelect(key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg border-l-[3px] px-3 py-2.5 text-left text-[13px] font-semibold transition-colors duration-150 ease-out ${
                  isActive ?
                  'border-accent bg-surface text-ink' :
                  'border-transparent text-muted hover:bg-surface/60 hover:text-ink'}`
                  }>
                  
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`}
                    aria-hidden="true" />
                  
                  <span className="flex-1 truncate">{key}</span>
                  {badge &&
                  <span
                    className={`tabular rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                    
                      {badge}
                    </span>
                  }
                </button>
              </li>);

          })}
        </ul>
      </nav>

      <nav aria-label="Other portals" className="border-t border-edge px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Operations</p>
        <ul className="space-y-0.5">
          {portals.map(({ to, label, Icon }) =>
          <li key={to}>
              <Link
              to={to}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-muted transition-colors duration-150 ease-out hover:bg-surface/60 hover:text-ink">
              
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="mt-auto border-t border-edge p-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-telemetry">
          
          <SmartphoneIcon className="h-4 w-4" aria-hidden="true" />
          Open citizen app
        </Link>
        <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-telemetry/15 text-2xs font-bold text-telemetry">
            KN
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">Insp. K. Naveed</p>
            <p className="tabular text-[10px] text-muted">PTP-3042 · Shift B</p>
          </div>
        </div>
      </div>
    </aside>);

}
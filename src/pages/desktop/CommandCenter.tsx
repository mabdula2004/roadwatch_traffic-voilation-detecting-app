import React, { useState } from 'react';
import { SearchIcon, BellIcon, RadioIcon } from 'lucide-react';
import { CommandSidebar, type CommandTab } from '../../components/desktop/CommandSidebar';
import { PendingQueueWorkspace } from '../../components/desktop/PendingQueueWorkspace';
import { CaseListWorkspace } from '../../components/desktop/CaseListWorkspace';
import { ReporterRegistryWorkspace } from '../../components/desktop/ReporterRegistryWorkspace';
import { ToastProvider } from '../../contexts/ToastContext';
import { approvedToday, disputedCases, fraudCases } from '../../data/queue';
import { Badge } from '../../components/ui/Badge';
import { useScreenInit } from '../../useScreenInit.js';

export function CommandCenter() {
  const screenInit = useScreenInit();
  const [tab, setTab] = useState<CommandTab>(screenInit.commandTab ?? 'Pending Queue');

  return (
    <div className="relative flex h-screen min-h-[720px] w-full overflow-hidden bg-canvas">
      <ToastProvider>
        <CommandSidebar active={tab} onSelect={setTab} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-4 border-b border-edge bg-canvas px-6 py-3.5">
            <h1 className="font-display text-sm font-bold text-ink">{tab}</h1>
            <Badge tone="telemetry" glow>
              <RadioIcon className="h-3 w-3" aria-hidden="true" />
              LIVE INTAKE
            </Badge>

            <div className="relative ml-auto w-72">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                aria-hidden="true" />
              
              <label htmlFor="case-search" className="sr-only">
                Search by plate, case ID or CNIC
              </label>
              <input
                id="case-search"
                placeholder="Search plate, case ID or CNIC"
                className="w-full rounded-lg border border-edge bg-surface py-2 pl-9 pr-3 text-xs text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/70 focus:border-telemetry" />
              
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-surface text-muted transition-colors duration-150 ease-out hover:text-ink">
              
              <BellIcon className="h-4 w-4" aria-hidden="true" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-signal" />
            </button>
          </header>

          {tab === 'Pending Queue' && <PendingQueueWorkspace />}

          {tab === 'Disputed Cases' &&
          <CaseListWorkspace
            title="Disputed Cases"
            description="Citizens have contested these challans within the 48-hour window. Each needs a human decision before the review fee is applied."
            cases={disputedCases}
            accent="telemetry"
            actionLabel="Open dispute" />

          }

          {tab === 'Fraud Alerts' &&
          <CaseListWorkspace
            title="Fraud Alerts"
            description="Reports where the Match Engine found registry inconsistencies, or the reporter's pattern suggests manipulation. Escalated to the Excise Fraud Unit."
            cases={fraudCases}
            accent="danger"
            actionLabel="Investigate" />

          }

          {tab === 'Approved Today' &&
          <CaseListWorkspace
            title="Approved Today"
            description="Challans issued by this shift. Citizens have been notified via the 8070 shortcode and the reward is pending clearance for each reporter."
            cases={approvedToday}
            accent="valid"
            actionLabel="View challan" />

          }

          {tab === 'Reporter Registry' && <ReporterRegistryWorkspace />}
        </div>
      </ToastProvider>
    </div>);

}
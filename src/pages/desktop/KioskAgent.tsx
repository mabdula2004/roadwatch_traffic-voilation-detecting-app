import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SearchIcon,
  BanknoteIcon,
  GavelIcon,
  PrinterIcon,
  StoreIcon,
  CheckCircle2Icon,
  ChevronLeftIcon } from
'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { fines } from '../../data/fines';

type Mode = 'pay' | 'appeal';

export function KioskAgent() {
  const [cnic, setCnic] = useState('35202-4417896-8');
  const [loaded, setLoaded] = useState(true);
  const [selected, setSelected] = useState(fines[0].id);
  const [mode, setMode] = useState<Mode>('pay');
  const [done, setDone] = useState(false);

  const fine = fines.find((f) => f.id === selected) ?? fines[0];

  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="flex shrink-0 items-center gap-5 border-b border-edge bg-canvas px-8 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
          <StoreIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-base font-bold text-ink">E-Sahulat Assisted Desk</h1>
          <p className="text-xs text-muted">Agent: Rizwan Ali · Outlet LHR-2291</p>
        </div>
        <Link
          to="/command"
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-accent">
          
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          RoadWatch Command
        </Link>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
        {/* Step 1 */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">Step 1 — Find citizen</p>
          <form
            className="mt-3 flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setLoaded(true);
              setDone(false);
            }}>
            
            <label htmlFor="kiosk-cnic" className="sr-only">
              CNIC or plate number
            </label>
            <input
              id="kiosk-cnic"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="CNIC or plate number"
              className="tabular flex-1 rounded-xl border border-edge bg-surface px-5 py-4 text-lg font-semibold text-ink outline-none transition-colors duration-150 ease-out placeholder:text-muted/60 focus:border-telemetry" />
            
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98]">
              
              <SearchIcon className="h-4 w-4" aria-hidden="true" />
              Look up
            </button>
          </form>
        </section>

        {loaded &&
        <>
            {/* Step 2 */}
            <section className="mt-8">
              <div className="flex items-end justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                  Step 2 — Select challan
                </p>
                <p className="text-xs text-muted">
                  Ahmed Raza Khan · LEA-4471 ·{' '}
                  <span className="tabular font-semibold text-ink">{fines.length} on record</span>
                </p>
              </div>

              <ul className="mt-3 space-y-2">
                {fines.map((f) => {
                const active = f.id === selected;
                return (
                  <li key={f.id}>
                      <button
                      type="button"
                      onClick={() => {
                        setSelected(f.id);
                        setDone(false);
                      }}
                      aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-center gap-5 rounded-xl border bg-surface px-5 py-4 text-left transition-colors duration-150 ease-out ${
                      active ? 'border-accent' : 'border-edge hover:border-edge/70'}`
                      }>
                      
                        <span
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        active ? 'border-accent bg-accent' : 'border-edge'}`
                        } />
                      
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">{f.violation}</p>
                          <p className="tabular mt-0.5 text-xs text-muted">
                            {f.id} · {f.issuedAt} · {f.location}
                          </p>
                        </div>
                        {f.status === 'disputed' && <Badge tone="telemetry">In dispute</Badge>}
                        <span className="tabular shrink-0 font-display text-lg font-bold text-accent">
                          PKR {f.amountPkr.toLocaleString()}
                        </span>
                      </button>
                    </li>);

              })}
              </ul>
            </section>

            {/* Step 3 */}
            <section className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                Step 3 — Process request
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {
              [
              {
                key: 'pay' as Mode,
                title: 'Pay fine in cash',
                body: `Collect PKR ${fine.amountPkr.toLocaleString()} and print a stamped receipt.`,
                Icon: BanknoteIcon
              },
              {
                key: 'appeal' as Mode,
                title: 'File an appeal',
                body: 'Submits for human review. PKR 500 fee only if the challan is upheld.',
                Icon: GavelIcon
              }].

              map(({ key, title, body, Icon }) =>
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setDone(false);
                }}
                aria-pressed={mode === key}
                className={`rounded-xl border bg-surface p-5 text-left transition-colors duration-150 ease-out ${
                mode === key ? 'border-accent' : 'border-edge hover:border-edge/70'}`
                }>
                
                    <Icon
                  className={`h-5 w-5 ${mode === key ? 'text-accent' : 'text-muted'}`}
                  aria-hidden="true" />
                
                    <p className="mt-3 font-display text-sm font-bold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
                  </button>
              )}
              </div>

              <button
              type="button"
              onClick={() => setDone(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-4 font-display text-sm font-bold text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-[0.98]">
              
                <PrinterIcon className="h-4 w-4" aria-hidden="true" />
                {mode === 'pay' ?
              `Confirm payment & print receipt` :
              'Submit appeal & print acknowledgement'}
              </button>

              {done &&
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-xl border border-valid/40 bg-valid/10 px-5 py-4">
              
                  <CheckCircle2Icon className="mt-0.5 h-5 w-5 shrink-0 text-valid" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {mode === 'pay' ?
                  `Payment recorded for ${fine.id}` :
                  `Appeal filed for ${fine.id}`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {mode === 'pay' ?
                  'Receipt LHR-2291-00841 printed. Citizen notified via 8070.' :
                  'Reference APP-2291-0117 printed. Decision expected within 7 working days.'}
                    </p>
                  </div>
                </div>
            }
            </section>
          </>
        }
      </div>
    </div>);

}
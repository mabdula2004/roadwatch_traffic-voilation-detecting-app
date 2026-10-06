import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, SearchIcon, CheckCircle2Icon, AlertTriangleIcon, CarIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useScreenInit } from '../../useScreenInit.js';

interface Record {
  plate: string;
  model: string;
  color: string;
  owner: string;
  pendingFines: number;
  totalPkr: number;
  fraudFlag: boolean;
}

const registry: Record[] = [
{
  plate: 'LEB-9931',
  model: 'Toyota Corolla 2019',
  color: 'White',
  owner: 'M****d A**l',
  pendingFines: 3,
  totalPkr: 6500,
  fraudFlag: true
},
{
  plate: 'LEA-4471',
  model: 'Honda Civic 2021',
  color: 'Silver',
  owner: 'A****d R**a',
  pendingFines: 0,
  totalPkr: 0,
  fraudFlag: false
}];


export function PlateSearch() {
  const screenInit = useScreenInit();
  const initialQuery: string = screenInit.plateQuery ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<Record | null>(
    initialQuery ? registry.find((r) => r.plate === initialQuery) ?? null : null
  );
  const [notFound, setNotFound] = useState(false);

  const run = () => {
    const found = registry.find((r) => r.plate.toLowerCase() === query.trim().toLowerCase());
    setResult(found ?? null);
    setNotFound(!found && query.trim().length > 0);
  };

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-edge bg-canvas/95 px-4 py-3 backdrop-blur">
        <Link
          to="/safety"
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink">
          
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to Safety
        </Link>
        <Badge tone="neutral">Public registry</Badge>
      </header>

      <div className="px-4 pt-5">
        <h1 className="font-display text-xl font-bold leading-tight text-ink">Check a plate before you buy</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Confirm a vehicle is clear of pending challans and fraud flags. Owner identity stays masked.
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}>
          
          <label htmlFor="plate" className="sr-only">
            Vehicle plate number
          </label>
          <input
            id="plate"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="LEB-9931"
            className="tabular flex-1 rounded-xl border border-edge bg-surface px-3.5 py-3 font-display text-base font-bold tracking-widest text-ink outline-none transition-colors duration-150 ease-out placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/60 focus:border-telemetry" />
          
          <button
            type="submit"
            aria-label="Search plate"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-accent text-canvas shadow-glow-amber transition-transform duration-150 ease-out active:scale-95">
            
            <SearchIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {registry.map((r) =>
          <button
            key={r.plate}
            type="button"
            onClick={() => {
              setQuery(r.plate);
              setResult(r);
              setNotFound(false);
            }}
            className="tabular rounded-full border border-edge bg-surface px-2.5 py-1 text-2xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-telemetry">
            
              Try {r.plate}
            </button>
          )}
        </div>

        {notFound &&
        <div className="mt-5 rounded-2xl border border-edge bg-surface p-4 text-center">
            <p className="text-xs font-semibold text-ink">No record for “{query}”</p>
            <p className="mt-1 text-2xs text-muted">
              Plate may be unregistered in Punjab Excise. Verify the papers physically.
            </p>
          </div>
        }

        {result &&
        <motion.section
          key={result.plate}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className={`mt-5 rounded-2xl border bg-surface p-4 ${
          result.pendingFines > 0 || result.fraudFlag ? 'border-signal/40' : 'border-valid/40'}`
          }>
          
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="tabular font-display text-2xl font-bold tracking-wider text-ink">
                  {result.plate}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <CarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {result.model} · {result.color}
                </p>
              </div>
              {result.pendingFines === 0 && !result.fraudFlag ?
            <Badge tone="valid" glow>
                  <CheckCircle2Icon className="h-3 w-3" aria-hidden="true" />
                  CLEARED
                </Badge> :

            <Badge tone="danger" glow>
                  <AlertTriangleIcon className="h-3 w-3" aria-hidden="true" />
                  NOT CLEAR
                </Badge>
            }
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-edge bg-canvas px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted">Pending challans</dt>
                <dd className="tabular mt-1 font-display text-lg font-bold text-ink">{result.pendingFines}</dd>
              </div>
              <div className="rounded-xl border border-edge bg-canvas px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted">Outstanding</dt>
                <dd className="tabular mt-1 font-display text-lg font-bold text-ink">
                  PKR {result.totalPkr.toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge pt-3">
              <span className="text-2xs text-muted">Registered owner</span>
              <span className="tabular text-xs font-semibold text-ink">{result.owner}</span>
            </div>

            {result.fraudFlag &&
          <p className="mt-3 rounded-xl border border-signal/30 bg-signal/10 px-3 py-2.5 text-2xs leading-snug text-ink">
                Excise flag: colour on record does not match last three sightings. Possible plate cloning —
                do not purchase without an Excise verification letter.
              </p>
          }
          </motion.section>
        }
      </div>
    </div>);

}
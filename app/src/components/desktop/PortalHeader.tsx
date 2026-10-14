import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from 'lucide-react';

interface PortalHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function PortalHeader({ title, subtitle, children }: PortalHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-5 border-b border-edge bg-canvas px-6 py-3.5">
      <Link
        to="/command"
        className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:text-accent">
        
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        RoadWatch Command
      </Link>
      <div className="h-6 w-px bg-edge" />
      <div>
        <h1 className="font-display text-sm font-bold text-ink">{title}</h1>
        <p className="text-2xs text-muted">{subtitle}</p>
      </div>
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </header>);

}
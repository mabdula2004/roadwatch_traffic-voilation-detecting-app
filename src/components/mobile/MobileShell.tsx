import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { MonitorIcon } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { StatusBar } from './StatusBar';
import { ToastProvider } from '../../contexts/ToastContext';

interface MobileShellProps {
  deviceFrame?: boolean;
}

const routesWithoutNav = ['/'];

export function MobileShell({ deviceFrame = true }: MobileShellProps) {
  const { pathname } = useLocation();
  const showNav = !routesWithoutNav.includes(pathname);
  const frame = deviceFrame ?
  'lg:h-[884px] lg:w-[420px] lg:rounded-[46px] lg:border lg:border-edge lg:shadow-device' :
  '';

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center bg-canvas ${
      deviceFrame ? 'lg:justify-center lg:gap-5 lg:py-10' : ''}`
      }>
      
      <div className={`relative flex min-h-screen w-full flex-col overflow-hidden bg-canvas lg:min-h-0 ${frame}`}>
        <ToastProvider>
          <StatusBar />
          <main className="thin-scroll relative flex-1 overflow-y-auto">
            <Outlet />
          </main>
          {showNav && <BottomNav />}
          <div id="mobile-overlay-root" className="pointer-events-none absolute inset-0 z-50" />
        </ToastProvider>
      </div>

      {deviceFrame &&
      <Link
        to="/command"
        className="hidden items-center gap-2 rounded-full border border-edge bg-surface px-4 py-2 text-xs font-semibold text-muted transition-colors duration-150 ease-out hover:border-accent/50 hover:text-accent lg:inline-flex">
        
          <MonitorIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Open RoadWatch Command (desktop portal)
        </Link>
      }
    </div>);

}
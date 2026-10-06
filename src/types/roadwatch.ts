export type FineStatus = 'active' | 'disputed' | 'paid';

export interface Fine {
  id: string;
  shortcode: string;
  violation: string;
  plate: string;
  amountPkr: number;
  issuedAt: string;
  location: string;
  status: FineStatus;
  slaHoursLeft: number;
  evidenceThumb: string;
  officer: string;
  clipSeconds: number;
}

export interface PendingUpload {
  id: string;
  label: string;
  capturedAt: string;
  sizeMb: number;
  progress: number;
  state: 'uploading' | 'queued' | 'encrypting' | 'failed';
}

export interface QueueCase {
  id: string;
  plate: string;
  violation: string;
  reporter: string;
  reporterTrust: number;
  city: string;
  submittedAt: string;
  confidence: number;
  sirenDetected: boolean;
  flagged?: 'fraud' | 'dispute';
}

export interface FleetDriver {
  id: string;
  name: string;
  vehicle: string;
  violations: number;
  score: number;
  trend: 'up' | 'down' | 'flat';
}
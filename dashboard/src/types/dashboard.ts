export type CaseStatus =
  | 'pending_manual_review'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'submitted'
  | 'no_violation';

export interface RealQueueCase {
  reportId: string;
  caseId: string;
  plateNumber: string;
  violationType: string;
  violationName: string;
  reporterName: string;
  reporterTrust: number;
  reporterCnic?: string;
  city: string;
  locationName: string;
  submittedAt: string;
  rawDate: string;
  confidence: number;
  clarityScore: number;
  status: CaseStatus;
  isDisputed: boolean; // Citizen escalated with PKR 100 fee
  citizenNote?: string;
  citizenPlate?: string;
  citizenVehicleModel?: string;
  citizenVehicleColor?: string;
  citizenVehicleType?: string;
  frameUris: string[];
  videoUri?: string;
  geoLat?: number;
  geoLong?: number;
  officerVerdict?: 'accepted' | 'rejected';
  officerNote?: string;
  officerVerdictAt?: string;
  fineAmountPkr: number;
}

export type CommandTab =
  | 'Pending Queue'
  | 'Disputed Cases'
  | 'Approved Today'
  | 'Rejected Cases'
  | 'Reporter Registry';

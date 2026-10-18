import type { Fine } from '../types/roadwatch';

export const fines: Fine[] = [
{
  id: 'CH-88421',
  shortcode: '8070',
  violation: 'Red light violation',
  plate: 'LEA-4471',
  amountPkr: 2500,
  issuedAt: '17 Sep 2026, 19:42',
  location: 'Ferozepur Rd × Kalma Chowk, Lahore',
  status: 'active',
  slaHoursLeft: 41,
  evidenceThumb: 'evidence',
  officer: 'Insp. A. Raheem · PTP-2291',
  clipSeconds: 9
},
{
  id: 'CH-88107',
  shortcode: '8070',
  violation: 'Lane discipline — wrong way',
  plate: 'LEA-4471',
  amountPkr: 1500,
  issuedAt: '14 Sep 2026, 08:11',
  location: 'Canal Bank Rd, Lahore',
  status: 'active',
  slaHoursLeft: 12,
  evidenceThumb: 'communityclip',
  officer: 'S.I. M. Farooq · PTP-1178',
  clipSeconds: 6
},
{
  id: 'CH-87550',
  shortcode: '8070',
  violation: 'Mobile phone use while driving',
  plate: 'LEA-4471',
  amountPkr: 1000,
  issuedAt: '02 Sep 2026, 17:05',
  location: 'Main Blvd Gulberg, Lahore',
  status: 'disputed',
  slaHoursLeft: 31,
  evidenceThumb: 'commandframe',
  officer: 'Insp. K. Naveed · PTP-3042',
  clipSeconds: 11
}];
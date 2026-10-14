import type { FleetDriver, PendingUpload, QueueCase } from '../types/roadwatch';

export const pendingUploads: PendingUpload[] = [
{
  id: 'LOC-0091',
  label: 'Wrong-way motorcycle · Canal Bank',
  capturedAt: 'Today, 19:12',
  sizeMb: 48.2,
  progress: 68,
  state: 'uploading'
},
{
  id: 'LOC-0090',
  label: 'Signal jump · Jail Rd',
  capturedAt: 'Today, 18:04',
  sizeMb: 62.7,
  progress: 100,
  state: 'encrypting'
},
{
  id: 'LOC-0088',
  label: 'Blocked ambulance lane · Mall Rd',
  capturedAt: 'Yesterday, 21:47',
  sizeMb: 71.4,
  progress: 0,
  state: 'queued'
},
{
  id: 'LOC-0084',
  label: 'Overloaded rickshaw · Ravi Rd',
  capturedAt: '15 Sep, 07:22',
  sizeMb: 33.9,
  progress: 22,
  state: 'failed'
}];


export const queueCases: QueueCase[] = [
{
  id: 'RW-30219',
  plate: 'LEB-9931',
  violation: 'Red light violation',
  reporter: 'Hamza Tariq',
  reporterTrust: 94,
  city: 'Lahore',
  submittedAt: '3 min ago',
  confidence: 96,
  sirenDetected: false
},
{
  id: 'RW-30218',
  plate: 'LZH-2210',
  violation: 'Restricted lane — heavy vehicle',
  reporter: 'Ayesha Noor',
  reporterTrust: 88,
  city: 'Lahore',
  submittedAt: '11 min ago',
  confidence: 91,
  sirenDetected: true
},
{
  id: 'RW-30215',
  plate: 'AJK-0071',
  violation: 'Wrong way driving',
  reporter: 'Bilal Ahmed',
  reporterTrust: 71,
  city: 'Rawalpindi',
  submittedAt: '26 min ago',
  confidence: 84,
  sirenDetected: false
},
{
  id: 'RW-30211',
  plate: 'LEA-4471',
  violation: 'Mobile phone use',
  reporter: 'Sana Iqbal',
  reporterTrust: 97,
  city: 'Lahore',
  submittedAt: '42 min ago',
  confidence: 78,
  sirenDetected: false
},
{
  id: 'RW-30204',
  plate: 'LEC-6688',
  violation: 'No helmet — pillion',
  reporter: 'Usman Shah',
  reporterTrust: 62,
  city: 'Faisalabad',
  submittedAt: '1 hr ago',
  confidence: 69,
  sirenDetected: false,
  flagged: 'fraud'
}];


export const disputedCases: QueueCase[] = [
{
  id: 'RW-29880',
  plate: 'LEA-4471',
  violation: 'Mobile phone use',
  reporter: 'Sana Iqbal',
  reporterTrust: 97,
  city: 'Lahore',
  submittedAt: '6 hrs ago',
  confidence: 74,
  sirenDetected: false,
  flagged: 'dispute'
},
{
  id: 'RW-29812',
  plate: 'RIA-5520',
  violation: 'Red light violation',
  reporter: 'Kamran Butt',
  reporterTrust: 80,
  city: 'Rawalpindi',
  submittedAt: '9 hrs ago',
  confidence: 66,
  sirenDetected: true,
  flagged: 'dispute'
},
{
  id: 'RW-29790',
  plate: 'LED-1092',
  violation: 'Blocked emergency lane',
  reporter: 'Fatima Zubair',
  reporterTrust: 91,
  city: 'Lahore',
  submittedAt: '14 hrs ago',
  confidence: 58,
  sirenDetected: true,
  flagged: 'dispute'
}];


export const fraudCases: QueueCase[] = [
{
  id: 'RW-30204',
  plate: 'LEC-6688',
  violation: 'Plate cloning suspected',
  reporter: 'Usman Shah',
  reporterTrust: 62,
  city: 'Faisalabad',
  submittedAt: '1 hr ago',
  confidence: 41,
  sirenDetected: false,
  flagged: 'fraud'
},
{
  id: 'RW-30101',
  plate: 'LEX-7712',
  violation: 'Excise colour mismatch',
  reporter: 'Danish Gill',
  reporterTrust: 44,
  city: 'Lahore',
  submittedAt: '4 hrs ago',
  confidence: 33,
  sirenDetected: false,
  flagged: 'fraud'
}];


export const approvedToday: QueueCase[] = [
{
  id: 'RW-30190',
  plate: 'LEB-1140',
  violation: 'Red light violation',
  reporter: 'Sana Iqbal',
  reporterTrust: 97,
  city: 'Lahore',
  submittedAt: '2 hrs ago',
  confidence: 98,
  sirenDetected: false
},
{
  id: 'RW-30177',
  plate: 'LEG-8801',
  violation: 'Blocked emergency lane',
  reporter: 'Ahmed Raza Khan',
  reporterTrust: 94,
  city: 'Lahore',
  submittedAt: '3 hrs ago',
  confidence: 93,
  sirenDetected: true
},
{
  id: 'RW-30162',
  plate: 'RIB-3390',
  violation: 'Wrong way driving',
  reporter: 'Kamran Butt',
  reporterTrust: 80,
  city: 'Rawalpindi',
  submittedAt: '5 hrs ago',
  confidence: 89,
  sirenDetected: false
},
{
  id: 'RW-30140',
  plate: 'LEC-2214',
  violation: 'No helmet — rider',
  reporter: 'Fatima Zubair',
  reporterTrust: 91,
  city: 'Lahore',
  submittedAt: '7 hrs ago',
  confidence: 87,
  sirenDetected: false
}];


export const fleetDrivers: FleetDriver[] = [
{ id: 'D-1042', name: 'Imran Qadir', vehicle: 'TLA-2299 · Hino 500', violations: 9, score: 48, trend: 'up' },
{ id: 'D-1017', name: 'Rehan Aslam', vehicle: 'TLA-1183 · Isuzu NPR', violations: 6, score: 61, trend: 'up' },
{ id: 'D-1088', name: 'Waqar Zia', vehicle: 'TLB-7740 · Shehzore', violations: 4, score: 74, trend: 'flat' },
{ id: 'D-1005', name: 'Naveed Anjum', vehicle: 'TLA-0021 · Hino 300', violations: 2, score: 86, trend: 'down' },
{ id: 'D-1063', name: 'Shahid Mehmood', vehicle: 'TLB-5512 · Isuzu FVR', violations: 1, score: 93, trend: 'down' }];
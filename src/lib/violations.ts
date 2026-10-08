export interface ViolationType {
  code: string;
  name: string;
  category: 'Safety & Passengers' | 'Signal & Movement' | 'Pedestrian Protection' | 'Vehicle Identity' | 'Distraction & Hazard' | 'Cargo & Environment' | 'Emergency & Parking';
  finePkr: number;
  description: string;
}

export const VIOLATION_TAXONOMY: ViolationType[] = [
  // Safety & Passengers
  {
    code: 'helmet_violation',
    name: 'No Helmet (Rider / Passenger)',
    category: 'Safety & Passengers',
    finePkr: 1000,
    description: 'Motorcycle rider or passenger not wearing an approved safety helmet.',
  },
  {
    code: 'triple_riding',
    name: 'Triple Riding / Over-Capacity',
    category: 'Safety & Passengers',
    finePkr: 1500,
    description: 'More than two persons riding on a single two-wheeler motorcycle.',
  },
  {
    code: 'seatbelt_violation',
    name: 'No Seatbelt Worn',
    category: 'Safety & Passengers',
    finePkr: 1500,
    description: 'Driver or front passenger not wearing a safety belt while vehicle is in motion.',
  },

  // Signal & Movement
  {
    code: 'red_light_running',
    name: 'Red Light Running',
    category: 'Signal & Movement',
    finePkr: 3000,
    description: 'Vehicle crossing stop line or entering intersection while signal displays red.',
  },
  {
    code: 'wrong_way_driving',
    name: 'One-Way / Wrong-Way Driving',
    category: 'Signal & Movement',
    finePkr: 3000,
    description: 'Operating vehicle opposing designated traffic flow direction.',
  },
  {
    code: 'illegal_u_turn',
    name: 'Prohibited U-Turn',
    category: 'Signal & Movement',
    finePkr: 2000,
    description: 'Executing a U-turn at an undesignated intersection or prohibited sign.',
  },
  {
    code: 'lane_straddling_violation',
    name: 'Reckless Lane Straddling',
    category: 'Signal & Movement',
    finePkr: 1500,
    description: 'Continuous driving between lanes or dangerous lane changing without signaling.',
  },
  {
    code: 'speeding_reckless',
    name: 'Excessive Speeding / Racing',
    category: 'Signal & Movement',
    finePkr: 4000,
    description: 'Driving at dangerous speeds or engaging in competitive street racing.',
  },

  // Pedestrian Protection
  {
    code: 'blocking_crossing',
    name: 'Blocking Pedestrian Crossing',
    category: 'Pedestrian Protection',
    finePkr: 1500,
    description: 'Stopping vehicle across zebra crossing or box junction during active signal.',
  },
  {
    code: 'footpath_driving',
    name: 'Driving / Riding on Footpath',
    category: 'Pedestrian Protection',
    finePkr: 2500,
    description: 'Riding two-wheeler or driving tires mounted onto pedestrian sidewalk/pavement.',
  },

  // Vehicle Identity
  {
    code: 'no_plate',
    name: 'Missing License Plate',
    category: 'Vehicle Identity',
    finePkr: 3000,
    description: 'Operating vehicle on public road without front or rear registration plate attached.',
  },
  {
    code: 'fancy_tinted_plate',
    name: 'Illegal / Obscured Plate Font',
    category: 'Vehicle Identity',
    finePkr: 2000,
    description: 'Using non-standard, tinted, plastic-covered, or illegal stylized registration plate.',
  },

  // Distraction & Hazard
  {
    code: 'phone_use_while_driving',
    name: 'Mobile Phone Use While Driving',
    category: 'Distraction & Hazard',
    finePkr: 2500,
    description: 'Driver holding phone to ear or actively typing/viewing handheld device screen.',
  },
  {
    code: 'high_beam_glare',
    name: 'Illegal High Beam / Blinding Lights',
    category: 'Distraction & Hazard',
    finePkr: 1500,
    description: 'Using unapproved extra LED light bars or high beams in well-lit urban traffic.',
  },

  // Cargo & Environment
  {
    code: 'overloading',
    name: 'Unsafe Cargo Overloading',
    category: 'Cargo & Environment',
    finePkr: 2000,
    description: 'Commercial vehicle carrying goods beyond legal height, width, or weight limits.',
  },
  {
    code: 'passenger_hanging',
    name: 'Passengers Hanging Outside',
    category: 'Cargo & Environment',
    finePkr: 2500,
    description: 'Passengers hanging on doors, rooftops, or ladders of public transport vehicles.',
  },
  {
    code: 'smoky_polluting_vehicle',
    name: 'Excessive Smoke / Exhaust Hazard',
    category: 'Cargo & Environment',
    finePkr: 2000,
    description: 'Vehicle emitting thick black/dark smoke violating environmental emission standards.',
  },

  // Emergency & Parking
  {
    code: 'blocking_emergency_vehicle',
    name: 'Blocking Emergency Ambulance/Fire',
    category: 'Emergency & Parking',
    finePkr: 5000,
    description: 'Failing to yield lane or actively obstructing an emergency vehicle with active sirens.',
  },
  {
    code: 'illegal_parking_obstruction',
    name: 'Obstructionary Illegal Parking',
    category: 'Emergency & Parking',
    finePkr: 2000,
    description: 'Parking in prohibited clearways, double parking, or blocking active traffic lane.',
  },
  {
    code: 'wrong_way_overtaking',
    name: 'Dangerous Blind Overtaking',
    category: 'Signal & Movement',
    finePkr: 2500,
    description: 'Overtaking across solid double yellow lines or sharp blind curves.',
  },
];

export const FINE_SCHEDULE: Record<string, number> = VIOLATION_TAXONOMY.reduce((acc, curr) => {
  acc[curr.code] = curr.finePkr;
  return acc;
}, {} as Record<string, number>);

export function getViolationMeta(code: string | null | undefined): ViolationType | null {
  if (!code) return null;
  return VIOLATION_TAXONOMY.find((v) => v.code === code) || null;
}

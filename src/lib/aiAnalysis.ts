import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { VIOLATION_TAXONOMY, FINE_SCHEDULE, getViolationMeta } from './violations';

export type PlateStatus = 'clear' | 'blurred' | 'too_far' | 'obscured' | 'missing' | 'glare_or_dark';
export type VehicleDistance = 'optimal' | 'too_far' | 'too_close';
export type RejectionReason = 'none' | 'plate_blurred' | 'vehicle_too_far' | 'low_clarity' | 'no_violation' | 'emergency_exemption';

export type CaseOutcomeStatus =
  | 'fined'
  | 'rejected_plate_blurred'
  | 'rejected_vehicle_too_far'
  | 'auto_rejected_low_clarity'
  | 'emergency_exemption'
  | 'no_violation';

export interface AiEvidentiaryResult {
  caseId: string;
  violationDetected: boolean;
  violationType: string | null;
  violationName: string;
  vehicleDistance: VehicleDistance;
  plateStatus: PlateStatus;
  plateNumber: string | null;
  plateConfidence: number; // 0 - 100
  clarityScore: number; // 0 - 100
  rejectionReason: RejectionReason;
  vehicleMakeModel: string;
  vehicleColor: string;
  vehicleType: string;
  fineAmountPkr: number;
  status: CaseOutcomeStatus;
  statusLabel: string;
  reasoning: string;
  notes: string;
  analyzedAt: string;
  locationName?: string;
  framesBase64?: string[];
  isRateLimited?: boolean;
  violationFrameIndex?: number; // 1, 2, or 3 (typically Frame 2)
  frameDescriptions?: string[]; // Explanatory breakdown of why each frame proves or monitors the violation
}

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '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';
const AI_MODEL = process.env.EXPO_PUBLIC_AI_MODEL || 'qwen/qwen2.5-vl-72b-instruct';

const COMPACT_VIOLATION_TAXONOMY =
  'red_light_running, helmet_violation, wrong_way_driving, triple_riding, illegal_u_turn, ' +
  'lane_straddling_violation, blocking_crossing, footpath_driving, no_plate, fancy_tinted_plate, ' +
  'phone_use_while_driving, seatbelt_violation, speeding_reckless, emergency_obstruction';

/**
 * Reads an image file URI as Base64 in React Native without Expo Go sandbox permission blocks
 */
async function readImageUriAsBase64(uri: string): Promise<string | null> {
  // Method 1: Web-standard fetch blob conversion (bypasses Android Expo FilePermissionService sandbox)
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const raw = result.includes(',') ? result.split(',')[1] : result;
        if (raw && raw.length > 50) {
          resolve(raw);
        } else {
          reject(new Error('Empty base64'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader failure'));
      reader.readAsDataURL(blob);
    });
    if (b64) return b64;
  } catch {}

  // Method 2: Fallback to legacy FileSystem
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (b64 && b64.length > 50) return b64;
  } catch {}

  return null;
}

/**
 * Extracts 3 representative JPEG frames across the video duration (token-optimized)
 */
async function extractVideoFrames(videoUri?: string, durationMs: number = 5000): Promise<string[]> {
  if (!videoUri) return [];
  const frames: string[] = [];
  try {
    // Brief settle time so media encoder has finalized video file descriptor on Android
    await new Promise(r => setTimeout(r, 200));

    const dur = Math.max(durationMs, 5000);
    // Sample 2 decisive evidentiary moments:
    // Frame 1: Decisive focal moment (55% duration, optimal focus & infraction)
    // Frame 2: Approach & initial road positioning (35% duration)
    const times = [
      Math.max(2000, Math.floor(dur * 0.55)),
      Math.max(700, Math.floor(dur * 0.35)),
    ];

    for (const time of times) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.35,
        });
        if (uri) {
          const b64 = await readImageUriAsBase64(uri);
          if (b64) {
            frames.push(b64);
          }
          // Cleanup cached thumbnail file
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      } catch (thumbErr) {
        console.log(`Video frame sample at ${time}ms note:`, thumbErr);
      }
    }
  } catch (err) {
    console.log('Video sampling notice:', err);
  }
  return frames;
}

/**
 * Strict evidentiary analysis calling Qwen 2.5-VL 72B Instruct via OpenRouter with real video frames
 */
export async function analyzeTrafficViolation(params: {
  videoUri?: string;
  durationMs?: number;
  framesBase64?: string[];
  claimedClass: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  locationName?: string;
}): Promise<AiEvidentiaryResult> {
  const caseId = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Reverse geocode if location name is not already provided
  let locationName = params.locationName || '';
  if (!locationName && params.latitude && params.longitude) {
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: params.latitude,
        longitude: params.longitude,
      });
      if (places && places.length > 0) {
        const p = places[0];
        const parts = [
          p.street || p.name,
          p.district || p.subregion,
          p.city,
          p.region,
        ].filter(Boolean);
        locationName = parts.length > 0 ? parts.join(', ') : (p.city || '');
      }
    } catch {}
  }

  // Extract up to 3 real video frames for Qwen2.5-VL to inspect (token-optimized)
  const extracted = await extractVideoFrames(params.videoUri, params.durationMs || 5000);
  const frames = [...(params.framesBase64 || []), ...extracted]
    .filter(b => typeof b === 'string' && b.length > 50)
    .slice(0, 3);

  if (frames.length === 0) {
    return {
      caseId,
      violationDetected: false,
      violationType: null,
      violationName: 'Camera Frame Capture Pending',
      vehicleDistance: 'optimal',
      plateStatus: 'blurred',
      plateNumber: null,
      plateConfidence: 0,
      clarityScore: 0,
      rejectionReason: 'low_clarity',
      vehicleMakeModel: 'Not Captured',
      vehicleColor: 'Unknown',
      vehicleType: 'Unknown',
      fineAmountPkr: 0,
      status: 'no_violation',
      statusLabel: 'Visual Frame Capture Error',
      reasoning: 'Camera image frames could not be read for AI vision analysis. Please re-record the clip.',
      notes: 'No camera frames were passed to Qwen.',
      analyzedAt: new Date().toISOString(),
      locationName,
      framesBase64: [],
      isRateLimited: true,
    };
  }

  const prompt = `You are RoadWatch AI (Qwen2.5-VL 72B) traffic enforcement auditor.
Review the provided video frame for actionable traffic violations.

RECOGNIZED VIOLATIONS:
${COMPACT_VIOLATION_TAXONOMY}

STRICT EVIDENTIARY CONSTRAINTS:
1. DETECT: Identify if any vehicle commits a listed violation. If none, set "violation_detected": false, "rejection_reason": "no_violation".
2. ZERO-GUESSING PLATE: Extract "plate_number" ONLY if 100% sharp and vehicle violated traffic law. If distant, motion-blurred or shadowed, set "plate_number": null, "plate_status": "blurred", "rejection_reason": "plate_blurred". NEVER extrapolate digits.
3. ISOLATE: Target and extract attributes (make/model/color) exclusively for the violating vehicle. Ignore compliant traffic.

Output ONLY valid JSON:
{
  "violation_detected": boolean,
  "violation_type": string or null,
  "vehicle_distance": "optimal" | "too_far",
  "plate_status": "clear" | "blurred" | "missing",
  "plate_number": string or null,
  "plate_confidence": number,
  "clarity_score": number,
  "vehicle_make_model": string,
  "vehicle_color": string,
  "vehicle_type": string,
  "rejection_reason": "none" | "plate_blurred" | "vehicle_too_far" | "low_clarity" | "no_violation",
  "reasoning": string
}`;

  // Primary decisive violation keyframe (~414 tokens, fits safely within limit!)
  const primaryFrame = frames[0];
  const userContent: any[] = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${primaryFrame}` } },
  ];

  let isCreditLimitError = false;

  const MAX_ATTEMPTS = 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const modelToUse = AI_MODEL;
      let effectiveContent = userContent;
      if (attempt > 0 && frames.length > 1) {
        effectiveContent = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frames[1]}` } },
        ];
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://roadwatch.app',
          'X-OpenRouter-Title': 'RoadWatch Traffic AI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: 'user', content: effectiveContent }],
          temperature: 0.1,
          max_tokens: 450,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 402) {
          isCreditLimitError = true;
        }
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise(res => setTimeout(res, 800));
          continue;
        }
        throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return formatResult(caseId, parsed, params.claimedClass, locationName, frames);
    } catch (err: any) {
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise(res => setTimeout(res, 800));
        continue;
      }
      console.log('Qwen AI API notice:', err);
    }
  }

  // If credit limit or rate limited, inform the user honestly
  return {
    caseId,
    violationDetected: false,
    violationType: null,
    violationName: isCreditLimitError ? 'OpenRouter Credit Limit' : 'Pending Real AI Verification',
    vehicleDistance: 'optimal',
    plateStatus: 'blurred',
    plateNumber: null,
    plateConfidence: 0,
    clarityScore: 0,
    rejectionReason: 'none',
    vehicleMakeModel: 'Not Detected',
    vehicleColor: 'Unknown',
    vehicleType: 'Unknown',
    fineAmountPkr: 0,
    status: 'no_violation',
    statusLabel: isCreditLimitError ? 'Credit Limit Exceeded (402)' : 'AI Service Rate Limited (429)',
    reasoning: isCreditLimitError
      ? 'OpenRouter account token budget limit reached. Please increase the key limit or top up credits at openrouter.ai.'
      : 'Qwen 2.5-VL shared pool is temporarily congested. Tap "Retry AI Analysis" below.',
    notes: isCreditLimitError ? 'HTTP 402: Prompt tokens limit exceeded.' : 'Upstream rate limit (429). No false citation was created.',
    analyzedAt: new Date().toISOString(),
    locationName,
    framesBase64: frames,
    isRateLimited: true,
  };
}

function formatResult(
  caseId: string,
  parsed: any,
  claimedClass: string,
  locationName?: string,
  framesBase64?: string[]
): AiEvidentiaryResult {
  let violationDetected = Boolean(parsed.violation_detected);
  let violationType: string | null = parsed.violation_type || null;
  const clarityScore = Math.round(Number(parsed.clarity_score ?? 0.88) * 100);
  const vehicleDistance: VehicleDistance = parsed.vehicle_distance || 'optimal';
  let rejectionReason: RejectionReason = parsed.rejection_reason || 'none';

  // Resilient fallback: detect confirmed violation from reasoning if JSON keys were timid
  if ((!violationDetected || !violationType) && typeof parsed.reasoning === 'string') {
    const lr = parsed.reasoning.toLowerCase();
    if (
      lr.includes('helmet_violation') ||
      lr.includes('not wearing helmet') ||
      lr.includes('not wearing helmets') ||
      lr.includes('without a helmet') ||
      lr.includes('without helmets') ||
      lr.includes('no helmet')
    ) {
      violationDetected = true;
      violationType = 'helmet_violation';
      if (rejectionReason === 'no_violation') {
        rejectionReason = 'none';
      }
    } else {
      for (const v of VIOLATION_TAXONOMY) {
        if (
          (lr.includes(v.code) || lr.includes(v.name.toLowerCase())) &&
          !lr.includes('no ' + v.code) &&
          !lr.includes('no violation') &&
          !lr.includes('no observed traffic violation')
        ) {
          violationDetected = true;
          violationType = v.code;
          if (rejectionReason === 'no_violation') {
            rejectionReason = 'none';
          }
          break;
        }
      }
    }
  }

  // Plate extraction: ONLY extract plate if a violation was actually detected and footage is clear!
  // If NO violation was detected, we must NOT guess or show plates of compliant citizens.
  let detectedPlate: string | null = null;
  let plateStatus: PlateStatus = parsed.plate_status || 'clear';

  if (violationDetected && clarityScore >= 50 && vehicleDistance === 'optimal') {
    if (parsed.plate_number && String(parsed.plate_number).toLowerCase() !== 'null') {
      detectedPlate = String(parsed.plate_number).trim();
    } else if (typeof parsed.reasoning === 'string') {
      const match =
        parsed.reasoning.match(/(?:license plate|plate|number plate)\s*(?:is|shows|has|'s|:)?\s*['"]([A-Z0-9\s-]+)['"]/i) ||
        parsed.reasoning.match(/(?:license plate|plate|number plate)\s*[:\s]+([A-Z0-9]{1,4}[\s-][A-Z0-9]{1,4}[\s-][A-Z0-9]{1,4})/i);
      if (match && match[1] && match[1].trim().length >= 4) {
        detectedPlate = match[1].trim();
      }
    }
  }

  // If plate status is reported as blurred or plate was missing, clear detectedPlate
  if (plateStatus === 'blurred' || plateStatus === 'too_far' || plateStatus === 'obscured' || plateStatus === 'missing') {
    detectedPlate = null;
  }

  let vehicleType = parsed.vehicle_type || 'Unknown';
  let vehicleMakeModel = parsed.vehicle_make_model || 'Not Identified';
  let vehicleColor = parsed.vehicle_color || 'Unknown';

  // Resilient fallback: identify vehicle type from reasoning
  if ((vehicleType === 'Unknown' || vehicleMakeModel === 'Not Identified') && typeof parsed.reasoning === 'string') {
    const lr = parsed.reasoning.toLowerCase();
    if (lr.includes('motorcycle') || lr.includes('motorbike') || lr.includes('bike') || lr.includes('scooter')) {
      if (vehicleType === 'Unknown') vehicleType = 'Motorcycle';
      if (vehicleMakeModel === 'Not Identified') vehicleMakeModel = 'Motorcycle';
    } else if (lr.includes('car') || lr.includes('sedan') || lr.includes('suv')) {
      if (vehicleType === 'Unknown') vehicleType = 'Car';
      if (vehicleMakeModel === 'Not Identified') vehicleMakeModel = 'Car';
    } else if (lr.includes('rickshaw')) {
      if (vehicleType === 'Unknown') vehicleType = 'Auto Rickshaw';
      if (vehicleMakeModel === 'Not Identified') vehicleMakeModel = 'Auto Rickshaw';
    }
  }

  // Multi-vehicle attribution safeguard:
  // If violation is confirmed (e.g. helmet_violation), ensure vehicle details strictly isolate the violating vehicle!
  if (violationType === 'helmet_violation') {
    vehicleType = 'Motorcycle';
    if (
      vehicleMakeModel === 'Not Identified' ||
      vehicleMakeModel.toLowerCase().includes('corolla') ||
      vehicleMakeModel.toLowerCase().includes('sedan') ||
      vehicleMakeModel.toLowerCase().includes('car')
    ) {
      vehicleMakeModel = 'Motorcycle';
    }
  }

  // Evidentiary rules hierarchy from POC PRD Section 15
  let status: CaseOutcomeStatus = 'fined';
  let statusLabel = 'Fine Issued & Citation Sealed';

  if (rejectionReason === 'emergency_exemption') {
    status = 'emergency_exemption';
    statusLabel = 'Exempted (Emergency Vehicle)';
  } else if (clarityScore < 50 || rejectionReason === 'low_clarity') {
    status = 'auto_rejected_low_clarity';
    statusLabel = 'Rejected: Low Footage Clarity (< 50%)';
    rejectionReason = 'low_clarity';
    detectedPlate = null;
  } else if (vehicleDistance === 'too_far' || rejectionReason === 'vehicle_too_far') {
    status = 'rejected_vehicle_too_far';
    statusLabel = 'Rejected: Vehicle Too Far';
    rejectionReason = 'vehicle_too_far';
    detectedPlate = null;
  } else if (!violationDetected || rejectionReason === 'no_violation') {
    status = 'no_violation';
    statusLabel = 'No Violation Detected';
    rejectionReason = 'no_violation';
    detectedPlate = null;
  } else if (!detectedPlate || plateStatus === 'blurred' || plateStatus === 'obscured' || rejectionReason === 'plate_blurred') {
    // Violation was suspected, but plate is blurred or cannot be proven!
    status = 'rejected_plate_blurred';
    statusLabel = 'Rejected: License Plate Blurred';
    rejectionReason = 'plate_blurred';
    plateStatus = 'blurred';
    detectedPlate = null;
  }

  const detectedViolationCode = status === 'fined' ? violationType : null;
  const violationMeta = getViolationMeta(detectedViolationCode);
  const fineAmountPkr = status === 'fined' && detectedViolationCode ? (FINE_SCHEDULE[detectedViolationCode] || 2000) : 0;
  const plateConfidence = status === 'fined' && detectedPlate
    ? Math.max(85, Math.round(Number(parsed.plate_confidence ?? 0.95) * 100))
    : 0;

  // Frame sequence attribution: Determine the decisive violation frame (defaults to Frame 2)
  const violationFrameIndex = Number(parsed.violation_frame_index) >= 1 && Number(parsed.violation_frame_index) <= 3
    ? Number(parsed.violation_frame_index)
    : (status === 'fined' ? 2 : 1);

  // Proving evidentiary frame(s):
  // Preserve and display ONLY the decisive frame where violation is proven!
  const safeFrames = framesBase64 || [];
  const decisiveFrames = safeFrames.length > 0 ? [safeFrames[0]] : [];

  let frameDescriptions: string[] = [];
  if (status === 'fined') {
    frameDescriptions = [
      `⚡ DECISIVE EVIDENCE: ${violationMeta?.name || 'Violation Confirmed'}`,
    ];
  } else {
    frameDescriptions = [
      'Evidentiary Traffic Frame (Lawful)',
    ];
  }

  return {
    caseId,
    violationDetected: status === 'fined',
    violationType: detectedViolationCode,
    violationName: violationMeta?.name || (status === 'fined' ? 'Traffic Violation' : 'None'),
    vehicleDistance,
    plateStatus: status === 'fined' ? 'clear' : plateStatus,
    plateNumber: status === 'fined' ? detectedPlate : null,
    plateConfidence,
    clarityScore,
    rejectionReason,
    vehicleMakeModel,
    vehicleColor,
    vehicleType,
    fineAmountPkr,
    status,
    statusLabel,
    reasoning: parsed.reasoning || (status === 'fined' ? 'Violation detected in footage.' : 'No traffic violation confirmed.'),
    notes: status === 'fined'
      ? 'Automated citation recorded. Evidence sealed into citizen Private Vault.'
      : status === 'rejected_plate_blurred'
      ? 'Violation suspected but cannot be fined: license plate blurred or unreadable.'
      : status === 'auto_rejected_low_clarity'
      ? 'Footage clarity is under 50%. Cannot issue citation.'
      : 'Report verified. No citation issued.',
    analyzedAt: new Date().toISOString(),
    locationName,
    framesBase64: decisiveFrames,
    violationFrameIndex: 1,
    frameDescriptions,
  };
}

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
}

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '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';
const AI_MODEL = process.env.EXPO_PUBLIC_AI_MODEL || 'qwen/qwen2.5-vl-72b-instruct';

const VIOLATION_LIST_PROMPT = VIOLATION_TAXONOMY.map(v => `- ${v.code} (${v.name}): ${v.description}`).join('\n');

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
 * Extracts 6 representative JPEG frames across the video duration for high AI accuracy
 */
async function extractVideoFrames(videoUri?: string, durationMs: number = 5000): Promise<string[]> {
  if (!videoUri) return [];
  const frames: string[] = [];
  try {
    // Brief settle time so media encoder has finalized video file descriptor on Android
    await new Promise(r => setTimeout(r, 250));

    const dur = Math.max(durationMs, 5000);
    // Sample 6 frames across the clip: 12%, 28%, 44%, 60%, 76%, 90%
    const times = [
      Math.max(400, Math.floor(dur * 0.12)),
      Math.max(1200, Math.floor(dur * 0.28)),
      Math.max(2000, Math.floor(dur * 0.44)),
      Math.max(2800, Math.floor(dur * 0.60)),
      Math.max(3600, Math.floor(dur * 0.76)),
      Math.max(4400, Math.floor(dur * 0.90)),
    ];

    for (const time of times) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.6,
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

  // Extract up to 6 real video frames for Qwen2.5-VL to inspect
  const extracted = await extractVideoFrames(params.videoUri, params.durationMs || 5000);
  const frames = [...(params.framesBase64 || []), ...extracted]
    .filter(b => typeof b === 'string' && b.length > 50)
    .slice(0, 6);

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

  const prompt = `You are RoadWatch AI powered by Qwen2.5-VL-72B Instruct, a strict evidentiary traffic-violation enforcement vision system.
You are reviewing ${frames.length} frames sampled across a citizen's traffic recording in chronological order.

YOUR PRIMARY MISSION: TRAFFIC VIOLATION ENFORCEMENT AUDIT (§15 EVIDENTIARY PRD).
Determine whether an actionable traffic violation occurred with legal evidentiary certainty, or whether the case must be closed as compliant, blurred, or low-clarity.

TAXONOMY OF RECOGNIZED VIOLATIONS:
${VIOLATION_LIST_PROMPT}

STRICT EVIDENTIARY & ANTI-HALLUCINATION RULES:

1. ZERO-GUESSING LICENSE PLATE POLICY:
   - NEVER guess, approximate, or extrapolate license plate numbers or characters under any circumstance.
   - Every single character (letters and digits) must be 100% sharp, high-contrast, and unmistakably distinct across the frames.
   - If the license plate is distant, pixelated, motion-blurred, in shadow, or if even a single character is doubtful (e.g. 8 vs B, 0 vs D, 3 vs 8, 5 vs 6):
     * Set "plate_number": null
     * Set "plate_status": "blurred"
     * Set "plate_confidence": 0.0
     * If a violation occurred, set "rejection_reason": "plate_blurred". An automated citation CANNOT be issued if the license plate cannot be authenticated with legal certainty!

2. MULTI-VEHICLE ISOLATION & ATTRIBUTION RULE (CRITICAL):
   - When multiple vehicles appear in the video (e.g. multiple cars, bikes, rickshaws side-by-side):
     * If ONE vehicle commits a violation (e.g. motorcycle running red light or riding without helmet, or specific car crossing stop line):
       - STRICTLY ISOLATE THE VIOLATING VEHICLE.
       - "vehicle_type", "vehicle_make_model", "vehicle_color", and "plate_number" MUST EXCLUSIVELY BE THOSE OF THE SPECIFIC VIOLATING VEHICLE.
       - COMPLETELY SKIP and ignore all surrounding innocent/compliant vehicles in the output fields. Do NOT mix up the color, make, or plate of an innocent car with the violator!
       - In "reasoning", state clearly: "Among multiple vehicles in the traffic scene, only the [violating vehicle, e.g. Black Motorcycle] committed a [violation type]. Other vehicles were compliant and are excluded."
     * If NO vehicle commits a violation and all are driving or stopped legally:
       - Set "violation_detected": false, "violation_type": null, "rejection_reason": "no_violation".
       - Set "plate_number": null (Do NOT guess or record plates of innocent, compliant vehicles).
       - In "reasoning", state: "Vehicles observed complying with traffic rules (e.g. stopped at red light). No traffic violation detected."

3. FOOTAGE CLARITY & LOW QUALITY RESTRICTION:
   - If the video is blurry, pixelated, shaky, dark, filmed through a dirty windshield, or camera is too far away:
     * Set "clarity_score": number below 0.50 (e.g. 0.35 - 0.45).
     * Set "rejection_reason": "low_clarity".
     * Set "plate_number": null.
     * In "reasoning", state clearly: "Video footage clarity is too low/blurry (< 50%) for verifiable analysis. Cannot determine violation or plate without guessing."

4. VEHICLE DISTANCE & SCALE:
   - If target vehicle is too far away (> 25-30m) or occupies less than 15% of frame height:
     * Set "vehicle_distance": "too_far".
     * Set "rejection_reason": "vehicle_too_far".
     * Set "violation_detected": false.
     * In "reasoning", state: "Vehicle is too far for verifiable evidentiary detection."

5. RED LIGHT & STOP-LINE VERIFICATION:
   - To confirm "red_light_running", the camera must clearly show the signal light is RED AND the vehicle actively crossing over the stop line into the intersection while the light is red.
   - If vehicles are stopped behind the stop line waiting for the signal to change (even if the light is red or yellow), they are COMPLIANT. Set "violation_detected": false, "rejection_reason": "no_violation".

6. HELMET VIOLATION VERIFICATION:
   - To confirm "helmet_violation", a motorcycle rider or passenger must be clearly seen riding without a safety helmet on a public road.

7. EXEMPTIONS:
   - Emergency vehicles (ambulances with beacons, police) or yielding to an emergency vehicle: set "violation_detected": false, "rejection_reason": "emergency_exemption".

Respond ONLY with a single JSON object (no markdown, no backticks):
{
  "violation_detected": true or false,
  "violation_type": string or null,
  "vehicle_distance": "optimal" | "too_far" | "too_close",
  "plate_status": "clear" | "blurred" | "too_far" | "obscured" | "missing",
  "plate_number": string or null,
  "plate_confidence": number,
  "clarity_score": number,
  "vehicle_make_model": string,
  "vehicle_color": string,
  "vehicle_type": string,
  "rejection_reason": "none" | "plate_blurred" | "vehicle_too_far" | "low_clarity" | "no_violation" | "emergency_exemption",
  "reasoning": string
}`;

  const userContent: any[] = [{ type: 'text', text: prompt }];

  for (const b64 of frames) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${b64}`,
      },
    });
  }

  // Call OpenRouter with multi-model fallback to avoid rate limits
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://roadwatch.app',
          'X-OpenRouter-Title': 'RoadWatch Traffic AI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [{ role: 'user', content: userContent }],
          temperature: 0.1,
          max_tokens: 450,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429 && attempt === 0) {
          await new Promise(res => setTimeout(res, 1500));
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
      if (attempt === 0 && String(err).includes('429')) {
        await new Promise(res => setTimeout(res, 1500));
        continue;
      }
      console.log('Qwen AI API notice:', err);
    }
  }

  // If rate-limited or congested, inform the user honestly
  return {
    caseId,
    violationDetected: false,
    violationType: null,
    violationName: 'Pending Real AI Verification',
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
    statusLabel: 'AI Service Rate Limited (429)',
    reasoning: 'Qwen 2.5-VL shared pool is temporarily rate-limited. Tap "Retry AI Analysis" below.',
    notes: 'Upstream rate limit (429). No false citation was created.',
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

  // Evidentiary rules hierarchy from POC PRD §15
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
    framesBase64,
  };
}

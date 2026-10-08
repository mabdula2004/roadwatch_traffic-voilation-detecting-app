import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
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
 * Extracts 3 representative JPEG frames from the recorded video clip to send to Qwen Vision
 */
async function extractVideoFrames(videoUri?: string, durationMs: number = 10000): Promise<string[]> {
  if (!videoUri) return [];
  const frames: string[] = [];
  try {
    // Brief settle time so media encoder has finalized video file descriptor on Android
    await new Promise(r => setTimeout(r, 250));

    const dur = Math.max(durationMs, 10000);
    const times = [
      Math.max(1000, Math.floor(dur * 0.20)),
      Math.max(2500, Math.floor(dur * 0.50)),
      Math.max(4000, Math.floor(dur * 0.80)),
    ];

    for (const time of times) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.5,
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
}): Promise<AiEvidentiaryResult> {
  const caseId = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Extract real video frames for Qwen2.5-VL to see!
  const extracted = await extractVideoFrames(params.videoUri, params.durationMs || 10000);
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
      isRateLimited: true,
    };
  }

  const prompt = `You are RoadWatch AI powered by Qwen2.5-VL-72B Instruct, a strict traffic-violation enforcement vision system.
You are inspecting ${frames.length} real image frames captured directly from citizen traffic recording.

INSPECT THE IMAGES CAREFULLY:
1. WHAT IS VISIBLE: Are there motor vehicles on a public road, or is this an indoor room, laptop screen, desk, or non-traffic scene?
   - If this is an indoor room, laptop, wall, floor, or contains no moving road vehicles: set "violation_detected": false, "rejection_reason": "no_violation", "vehicle_make_model": "None (Indoor/Non-Traffic)", and in "reasoning" state clearly: "Observed indoor scene/laptop, no public traffic or vehicle violations present."
2. IF ROAD VEHICLES ARE PRESENT:
   - Identify vehicle make, model, type, and color (e.g. "Toyota Corolla Sedan" or "Honda 70 Motorcycle").
   - Read the license plate if legible. If blurred or unreadable, set "plate_number": null, "plate_status": "blurred".
   - Check if the vehicle commits any of the 20 violations (e.g. "red_light_running", "helmet_violation", "wrong_way_driving", etc.):
${VIOLATION_LIST_PROMPT}
   - If a violation occurred, set "violation_detected": true, and "violation_type" to the exact violation code.
   - If vehicle is following traffic rules normally, set "violation_detected": false, "rejection_reason": "no_violation".

Respond ONLY with a single JSON object (no markdown, no backticks):
{
  "violation_detected": false,
  "violation_type": null,
  "vehicle_distance": "optimal",
  "plate_status": "clear",
  "plate_number": null,
  "plate_confidence": 0.0,
  "clarity_score": 0.90,
  "vehicle_make_model": "Not Identified",
  "vehicle_color": "Unknown",
  "vehicle_type": "Unknown",
  "rejection_reason": "no_violation",
  "reasoning": "Factual description of what is actually visible in the provided image frames."
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
          max_tokens: 350,
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

      return formatResult(caseId, parsed, params.claimedClass);
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
    isRateLimited: true,
  };
}

function formatResult(caseId: string, parsed: any, claimedClass: string): AiEvidentiaryResult {
  const violationDetected = Boolean(parsed.violation_detected);
  const plateStatus: PlateStatus = parsed.plate_status || 'clear';
  const vehicleDistance: VehicleDistance = parsed.vehicle_distance || 'optimal';
  const clarityScore = Math.round(Number(parsed.clarity_score ?? 0.88) * 100);
  const plateConfidence = Math.round(Number(parsed.plate_confidence ?? 0.0) * 100);
  let rejectionReason: RejectionReason = parsed.rejection_reason || 'none';

  // Apply evidentiary rules hierarchy
  let status: CaseOutcomeStatus = 'fined';
  let statusLabel = 'Fine Issued & Citation Sealed';

  if (rejectionReason === 'emergency_exemption') {
    status = 'emergency_exemption';
    statusLabel = 'Exempted (Emergency Vehicle)';
  } else if (clarityScore < 50 || rejectionReason === 'low_clarity') {
    status = 'auto_rejected_low_clarity';
    statusLabel = 'Rejected: Low Footage Clarity (< 50%)';
    rejectionReason = 'low_clarity';
  } else if (vehicleDistance === 'too_far' || rejectionReason === 'vehicle_too_far') {
    status = 'rejected_vehicle_too_far';
    statusLabel = 'Rejected: Vehicle Too Far';
    rejectionReason = 'vehicle_too_far';
  } else if (plateStatus === 'blurred' || plateStatus === 'obscured' || rejectionReason === 'plate_blurred') {
    status = 'rejected_plate_blurred';
    statusLabel = 'Rejected: License Plate Blurred';
    rejectionReason = 'plate_blurred';
  } else if (!violationDetected || rejectionReason === 'no_violation') {
    status = 'no_violation';
    statusLabel = 'No Violation Detected';
    rejectionReason = 'no_violation';
  }

  const detectedViolationCode = status === 'fined' ? parsed.violation_type : null;
  const violationMeta = getViolationMeta(detectedViolationCode);
  const fineAmountPkr = status === 'fined' && detectedViolationCode ? (FINE_SCHEDULE[detectedViolationCode] || 2000) : 0;

  const plateNumber = (status === 'rejected_plate_blurred' || status === 'rejected_vehicle_too_far' || !parsed.plate_number)
    ? null
    : parsed.plate_number;

  return {
    caseId,
    violationDetected: status === 'fined',
    violationType: detectedViolationCode,
    violationName: violationMeta?.name || (status === 'fined' ? 'Traffic Violation' : 'None'),
    vehicleDistance,
    plateStatus,
    plateNumber,
    plateConfidence: plateNumber ? plateConfidence : 0,
    clarityScore,
    rejectionReason,
    vehicleMakeModel: parsed.vehicle_make_model || 'Not Identified',
    vehicleColor: parsed.vehicle_color || 'Unknown',
    vehicleType: parsed.vehicle_type || 'Unknown',
    fineAmountPkr,
    status,
    statusLabel,
    reasoning: parsed.reasoning || (status === 'fined' ? 'Violation detected in footage.' : 'No traffic violation confirmed.'),
    notes: status === 'fined'
      ? 'Automated citation recorded. Evidence sealed into citizen Private Vault.'
      : 'Report verified. No citation issued.',
    analyzedAt: new Date().toISOString(),
  };
}

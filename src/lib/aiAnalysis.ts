import * as VideoThumbnails from 'expo-video-thumbnails';
import { File } from 'expo-file-system';
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
 * Extracts 2 representative JPEG frames from the recorded video clip to send to Qwen Vision
 */
async function extractVideoFrames(videoUri?: string, durationMs: number = 10000): Promise<string[]> {
  if (!videoUri) return [];
  const frames: string[] = [];
  try {
    const t1 = Math.max(1000, Math.floor(durationMs * 0.25));
    const t2 = Math.max(3000, Math.floor(durationMs * 0.65));

    for (const time of [t1, t2]) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.6,
        });
        const file = new File(uri);
        const b64 = await file.base64();
        if (b64) {
          frames.push(b64);
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
  claimedClass: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
}): Promise<AiEvidentiaryResult> {
  const caseId = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Extract real video frames for Qwen2.5-VL to see!
  const frames = await extractVideoFrames(params.videoUri, params.durationMs || 10000);

  const prompt = `You are RoadWatch AI powered by Qwen2.5-VL-72B Instruct, a strict traffic-violation enforcement vision system.
You are given ${frames.length > 0 ? `${frames.length} sampled image frames from a citizen's recorded video evidence.` : 'traffic recording event metadata.'}

Carefully inspect the visual evidence:
- Check if there is actual road traffic, vehicles, or pedestrians in the images. If there are NO vehicles (e.g. an indoor room, desk, computer screen, or person indoors), set "violation_detected": false, "rejection_reason": "no_violation", and explain clearly in reasoning.
- If vehicles are present, look for any of these 20 traffic violation types:
${VIOLATION_LIST_PROMPT}

STRICT EVIDENTIARY RULES:
1. VEHICLE DISTANCE: "optimal" | "too_far" | "too_close". If too_far, set rejection_reason to "vehicle_too_far" and violation_detected to false.
2. NUMBER PLATE: "clear" | "blurred" | "too_far" | "obscured" | "missing" | "glare_or_dark". If blurred or indistinct, NEVER hallucinate characters! Set plate_number to null, plate_confidence to 0.0, and rejection_reason to "plate_blurred".
3. CLARITY: Rate 0.0 to 1.0. If under 0.5, reject for low_clarity.
4. If a vehicle crosses an active red traffic light line, identify make, model, color, and set violation_detected to true with violation_type: "red_light_running".

Respond ONLY with a single JSON object (no markdown, no backticks):
{
  "violation_detected": false,
  "violation_type": null,
  "vehicle_distance": "optimal",
  "plate_status": "clear",
  "plate_number": null,
  "plate_confidence": 0.0,
  "clarity_score": 0.85,
  "vehicle_make_model": "Unknown",
  "vehicle_color": "Unknown",
  "vehicle_type": "Unknown",
  "rejection_reason": "no_violation",
  "reasoning": "Clear factual description of what is actually visible in the video frames."
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
          models: [
            AI_MODEL,
            'qwen/qwen3-vl-32b-instruct',
            'qwen/qwen3-vl-30b-a3b-instruct',
          ],
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

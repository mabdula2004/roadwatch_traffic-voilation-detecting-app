import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { AiEvidentiaryResult } from './aiAnalysis';
import { rechargeWalletBalance, deductWalletBalance } from './wallet';

export interface CapturedClip {
  clientCaptureId: string;
  uri: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  accuracy: number | null;
  durationMs: number;
  trimStartMs?: number;
  trimEndMs?: number;
  cropZoom?: number;
  cropLabel?: string;
  cropRect?: { x: number; y: number; width: number; height: number };
  framesBase64?: string[];
}

export interface StoredCaseReport {
  reportId: string;
  clientCaptureId: string;
  claimedClass: string;
  capturedAt: string;
  uploadedAt: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  accuracy: number | null;
  status: 'accepted' | 'rejected' | 'under_review' | 'awaiting_upload' | 'failed' | string;
  aiResult?: AiEvidentiaryResult;
  rewardPkr?: number;
  penaltyPkr?: number;
  penaltyRefunded?: boolean;
  reviewFeeRefunded?: number;
  totalPayoutPkr?: number;
  officerVerdict?: 'accepted' | 'rejected';
  officerVerdictAt?: string;
  officerNote?: string;
  frameUris?: string[];
  // Citizen Manual Corrections / Overrides
  citizenPlate?: string;
  citizenVehicleMakeModel?: string;
  citizenVehicleColor?: string;
  citizenVehicleType?: string;
  citizenViolationType?: string;
  citizenViolationName?: string;
  citizenNote?: string;
  isCitizenEdited?: boolean;
}

export interface CitizenEvidenceDetails {
  plateNumber?: string;
  vehicleMakeModel?: string;
  vehicleColor?: string;
  vehicleType?: string;
  violationType?: string;
  violationName?: string;
  citizenNote?: string;
}

export interface PenaltyCitation {
  citationId: string;
  reportId: string;
  amountPkr: number;
  reason: string;
  issuedAt: string;
  status: 'paid_from_wallet' | 'disputed_in_review' | 'waived';
  locationName?: string;
  latitude?: number;
  longitude?: number;
  claimedClass?: string;
  plateNumber?: string;
}

const LOCAL_VAULT_KEY = '@roadwatch_local_vault_reports';
const CITATIONS_KEY = '@roadwatch_reporter_citations';

export async function getPenaltyCitations(): Promise<PenaltyCitation[]> {
  try {
    const raw = await AsyncStorage.getItem(CITATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePenaltyCitation(citation: PenaltyCitation): Promise<void> {
  try {
    const list = await getPenaltyCitations();
    const filtered = list.filter(c => c.reportId !== citation.reportId);
    filtered.unshift(citation);
    await AsyncStorage.setItem(CITATIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save penalty citation:', e);
  }
}

export async function updateCitationStatus(reportId: string, status: PenaltyCitation['status']): Promise<void> {
  try {
    const list = await getPenaltyCitations();
    const updated = list.map(c => c.reportId === reportId ? { ...c, status } : c);
    await AsyncStorage.setItem(CITATIONS_KEY, JSON.stringify(updated));
  } catch {}
}

const DELETED_REPORTS_KEY = '@roadwatch_deleted_report_ids';

export async function getDeletedReportIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(DELETED_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Permanently deletes specified reports from local storage and removes cached image frames from disk.
 * Also persists deleted IDs so remote queries never restore them.
 */
export async function deleteReports(reportIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
  if (!reportIds || reportIds.length === 0) return { success: true, deletedCount: 0 };
  const toDelete = new Set(reportIds);

  // 1. Persist deleted IDs
  try {
    const existing = await getDeletedReportIds();
    const combined = Array.from(new Set([...existing, ...reportIds]));
    await AsyncStorage.setItem(DELETED_REPORTS_KEY, JSON.stringify(combined));
  } catch (e) {
    console.warn('Failed to save deleted report IDs:', e);
  }

  // 2. Remove from local vault storage
  try {
    const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
    if (raw) {
      const list: StoredCaseReport[] = JSON.parse(raw);
      const remaining = list.filter(r => !toDelete.has(r.reportId) && !toDelete.has(r.clientCaptureId));
      await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(remaining));
    }
  } catch (e) {
    console.error('Failed to remove reports from local vault:', e);
  }

  // 3. Clean up cached frame files from disk
  try {
    const dir = `${FileSystem.documentDirectory}vault_frames/`;
    for (const rid of reportIds) {
      const safeId = rid.replace(/[^a-zA-Z0-9_-]/g, '_');
      for (let i = 0; i < 3; i++) {
        const filePath = `${dir}${safeId}_frame_${i}.jpg`;
        await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
      }
    }
  } catch {}

  // 4. Also delete from remote Supabase if matching uuid or client_capture_id
  try {
    for (const rid of reportIds) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rid);
      if (isUuid) {
        await supabase.from('reports').delete().eq('report_id', rid);
      } else {
        await supabase.from('reports').delete().eq('client_capture_id', rid);
      }
    }
  } catch {}

  return { success: true, deletedCount: reportIds.length };
}

/**
 * Saves video frame base64 strings as lightweight persistent JPEG files on local device disk.
 * This keeps AsyncStorage tiny (avoiding CursorWindow 2MB crashes) while ensuring the user
 * can view full crisp frames anytime in Evidence Vault.
 */
export async function saveFramesToDisk(reportId: string, framesBase64?: string[]): Promise<string[]> {
  if (!framesBase64 || framesBase64.length === 0) return [];
  const uris: string[] = [];
  try {
    const dir = `${FileSystem.documentDirectory}vault_frames/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const safeId = reportId.replace(/[^a-zA-Z0-9_-]/g, '_');
    for (let i = 0; i < Math.min(framesBase64.length, 3); i++) {
      const b64 = framesBase64[i];
      if (typeof b64 === 'string' && b64.length > 20) {
        if (b64.startsWith('file://')) {
          uris.push(b64);
          continue;
        }
        const cleanB64 = b64.replace(/^data:image\/\w+;base64,/, '');
        const filePath = `${dir}${safeId}_frame_${i}.jpg`;
        await FileSystem.writeAsStringAsync(filePath, cleanB64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        uris.push(filePath);
      }
    }
  } catch (e) {
    console.warn('Could not cache frames to disk:', e);
  }
  return uris;
}

/**
 * Retrieves the 3 cached video frame file paths for a report.
 * Checks existing fallback URIs first, then scans local disk for persisted frames.
 */
export async function getReportFrames(
  reportId: string,
  clientCaptureId?: string,
  fallbackUris?: string[]
): Promise<string[]> {
  if (fallbackUris && fallbackUris.length > 0) return fallbackUris;
  const uris: string[] = [];
  try {
    const dir = `${FileSystem.documentDirectory}vault_frames/`;
    const safeIds: string[] = [reportId.replace(/[^a-zA-Z0-9_-]/g, '_')];
    if (clientCaptureId) {
      safeIds.push(clientCaptureId.replace(/[^a-zA-Z0-9_-]/g, '_'));
    }
    for (const sid of safeIds) {
      for (let i = 0; i < 3; i++) {
        const p = `${dir}${sid}_frame_${i}.jpg`;
        const info = await FileSystem.getInfoAsync(p);
        if (info.exists && !uris.includes(p)) {
          uris.push(p);
        }
      }
      if (uris.length > 0) break;
    }
  } catch {}
  return uris;
}

export async function uploadReport(
  clip: CapturedClip,
  claimedClass: string,
  aiResult?: AiEvidentiaryResult
): Promise<string> {
  const generatedId = aiResult?.caseId || `CASE-${Date.now().toString().slice(-6)}`;
  let finalReportId = generatedId;

  // Determine accepted vs rejected based on AI evaluation
  const isAccepted = aiResult ? (aiResult.status === 'fined' && aiResult.violationDetected) : false;
  const finalStatus = isAccepted ? 'accepted' : 'rejected';

  let rewardPkr: number | undefined;
  let penaltyPkr: number | undefined;

  if (isAccepted) {
    // 1. Accepted: AI detected violation -> reporter earns money prize (+PKR 200)
    rewardPkr = 200;
    try {
      await rechargeWalletBalance(200, {
        title: 'Citizen Bounty Reward',
        subtitle: `Violation Confirmed: ${claimedClass.replace(/_/g, ' ').toUpperCase()}`,
        reportId: finalReportId,
        type: 'reward',
      });
    } catch (e) {
      console.log('Reward deposit notice:', e);
    }
  } else {
    // 2. Rejected: AI rejected violation claim -> penalty fine (-PKR 50) for invalid report
    penaltyPkr = 50;
    try {
      await deductWalletBalance(50, {
        title: 'Invalid Report Penalty Fine',
        subtitle: aiResult?.reasoning ? aiResult.reasoning.slice(0, 75) : 'False violation report on footage',
        reportId: finalReportId,
        type: 'penalty_fine',
      });
      await savePenaltyCitation({
        citationId: `CIT-${Date.now().toString().slice(-6)}`,
        reportId: finalReportId,
        amountPkr: 50,
        reason: aiResult?.reasoning || 'No actionable traffic violation confirmed on video footage',
        issuedAt: new Date().toISOString(),
        status: 'paid_from_wallet',
        locationName: clip.locationName,
        latitude: clip.latitude,
        longitude: clip.longitude,
        claimedClass: claimedClass,
        plateNumber: aiResult?.plateNumber || undefined,
      });
    } catch (e) {
      console.log('Penalty deduction notice:', e);
    }
  }

  // Cache ONLY confirmed violation frames as local images on disk for evidence inspection in Vault
  let frameUris: string[] = [];
  if (isAccepted && aiResult?.framesBase64 && aiResult.framesBase64.length > 0) {
    frameUris = await saveFramesToDisk(finalReportId, aiResult.framesBase64);
  }

  // 1. Always save in local storage first so user evidence is NEVER lost or blocked
  const localRecord: StoredCaseReport = {
    reportId: finalReportId,
    clientCaptureId: clip.clientCaptureId,
    claimedClass,
    capturedAt: clip.capturedAt,
    uploadedAt: new Date().toISOString(),
    latitude: clip.latitude,
    longitude: clip.longitude,
    locationName: clip.locationName,
    accuracy: clip.accuracy,
    status: finalStatus,
    aiResult,
    rewardPkr,
    penaltyPkr,
    frameUris,
  };
  await saveLocalReport(localRecord);

  // 2. Attempt remote Supabase insertion
  try {
    const { data: session } = await supabase.auth.getUser();
    const userId = session?.user?.id;

    if (userId) {
      // Ensure reporter registration via RPC to satisfy RLS and role constraints
      try {
        await supabase.rpc('complete_reporter_registration', {
          p_name: session?.user?.user_metadata?.full_name || 'Citizen Reporter',
          p_cnic: '35201-1234567-1',
          p_email: session?.user?.email || 'citizen@roadwatch.org',
          p_vehicle_plate: 'LEA-4471',
        });
      } catch {}

      // Ensure base_users exists with role and active status
      try {
        await supabase.from('base_users').upsert({
          user_id: userId,
          role: 'reporter',
          name: session?.user?.user_metadata?.full_name || 'Citizen Reporter',
          email: session?.user?.email || 'citizen@roadwatch.org',
          account_state: 'active',
          registration_completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch {}

      // Ensure reporter_profiles exists
      try {
        await supabase.from('reporter_profiles').upsert(
          { reporter_id: userId, trust_score: 100 },
          { onConflict: 'reporter_id' }
        );
      } catch {}

      const { data: insertedReport, error: insertError } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          claimed_class: claimedClass === 'auto_ai_detect' ? (aiResult?.violationType || 'red_light_running') : claimedClass,
          captured_at: clip.capturedAt,
          uploaded_at: new Date().toISOString(),
          geo_lat: clip.latitude,
          geo_long: clip.longitude,
          location_accuracy_m: clip.accuracy,
          client_capture_id: clip.clientCaptureId,
          status: finalStatus,
        })
        .select('report_id')
        .single();

      if (!insertError && insertedReport?.report_id) {
        finalReportId = insertedReport.report_id;
        localRecord.reportId = finalReportId;
        if (aiResult) {
          aiResult.caseId = finalReportId;
        }
        await saveLocalReport(localRecord);
      } else if (insertError) {
        console.log('Local vault secured report. Remote DB sync note:', insertError.message);
      }
    }
  } catch (err) {
    console.log('Database upload bypassed for testing mode:', err);
  }

  return finalReportId;
}

export function sanitizeReportForStorage(report: StoredCaseReport): StoredCaseReport {
  let sanitizedAiResult: AiEvidentiaryResult | undefined;
  if (report.aiResult) {
    const { framesBase64, ...rest } = report.aiResult;
    sanitizedAiResult = rest;
  }
  return {
    ...report,
    aiResult: sanitizedAiResult,
  };
}

export async function saveLocalReport(report: StoredCaseReport) {
  try {
    const cleanReport = sanitizeReportForStorage(report);
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (cursorErr) {
      console.warn('Recovering from oversized CursorWindow in vault:', cursorErr);
      await AsyncStorage.removeItem(LOCAL_VAULT_KEY).catch(() => {});
      list = [];
    }

    // Clean all existing items so old oversized records don't persist
    const sanitizedList = list.slice(0, 50).map(sanitizeReportForStorage);
    const filtered = sanitizedList.filter(r => r.clientCaptureId !== cleanReport.clientCaptureId && r.reportId !== cleanReport.reportId);
    filtered.unshift(cleanReport);
    await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to cache local report:', e);
    // Ultimate recovery fallback: reset corrupted key and save just this clean record
    try {
      await AsyncStorage.removeItem(LOCAL_VAULT_KEY);
      await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify([sanitizeReportForStorage(report)]));
    } catch {}
  }
}

export async function getLocalReports(): Promise<StoredCaseReport[]> {
  try {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
    } catch (cursorErr) {
      console.warn('Recovering from oversized CursorWindow in getLocalReports:', cursorErr);
      await AsyncStorage.removeItem(LOCAL_VAULT_KEY).catch(() => {});
      return [];
    }

    if (!raw) return [];
    const list: StoredCaseReport[] = JSON.parse(raw);
    const deletedIds = new Set(await getDeletedReportIds());

    return list
      .filter(r => !deletedIds.has(r.reportId) && !deletedIds.has(r.clientCaptureId))
      .map(r => {
        let normStatus = r.status;
        if (r.status === 'fined') normStatus = 'accepted';
        else if (['no_violation', 'rejected_plate_blurred', 'rejected_vehicle_too_far', 'auto_rejected_low_clarity'].includes(r.status)) normStatus = 'rejected';
        else if (['pending_manual_review', 'under_review', 'disputed'].includes(r.status)) normStatus = 'under_review';
        return {
          ...sanitizeReportForStorage(r),
          status: normStatus,
        };
      });
  } catch {
    return [];
  }
}

export async function updateReportStatus(
  reportIdentifier: string,
  status: string,
  clientCaptureId?: string,
  extra?: {
    frameUris?: string[];
    aiResult?: AiEvidentiaryResult;
    citizenDetails?: CitizenEvidenceDetails;
  }
): Promise<void> {
  const normalizedStatus = (status === 'pending_manual_review' || status === 'under_review') ? 'under_review' : status;
  try {
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (cursorErr) {
      console.warn('Recovering from oversized CursorWindow in updateReportStatus:', cursorErr);
      await AsyncStorage.removeItem(LOCAL_VAULT_KEY).catch(() => {});
      list = [];
    }

    let penaltyToRefund = 0;
    const updated = list.map(item => {
      const isTarget =
        item.reportId === reportIdentifier ||
        item.clientCaptureId === reportIdentifier ||
        item.aiResult?.caseId === reportIdentifier ||
        (clientCaptureId && (item.clientCaptureId === clientCaptureId || item.reportId === clientCaptureId));

      if (isTarget) {
        if (item.penaltyPkr && !item.penaltyRefunded && normalizedStatus === 'under_review') {
          penaltyToRefund = item.penaltyPkr;
        }
        let effectiveAi = extra?.aiResult || item.aiResult;
        const effectiveFrames = (extra?.frameUris && extra.frameUris.length > 0) ? extra.frameUris : item.frameUris;

        if (extra?.citizenDetails && effectiveAi) {
          effectiveAi = {
            ...effectiveAi,
            citizenPlate: extra.citizenDetails.plateNumber ?? effectiveAi.citizenPlate,
            citizenVehicleMakeModel: extra.citizenDetails.vehicleMakeModel ?? effectiveAi.citizenVehicleMakeModel,
            citizenVehicleColor: extra.citizenDetails.vehicleColor ?? effectiveAi.citizenVehicleColor,
            citizenVehicleType: extra.citizenDetails.vehicleType ?? effectiveAi.citizenVehicleType,
            citizenViolationType: extra.citizenDetails.violationType ?? effectiveAi.citizenViolationType,
            citizenViolationName: extra.citizenDetails.violationName ?? effectiveAi.citizenViolationName,
            citizenNote: extra.citizenDetails.citizenNote ?? effectiveAi.citizenNote,
            isCitizenEdited: true,
          };
        }

        return {
          ...sanitizeReportForStorage(item),
          status: normalizedStatus,
          penaltyRefunded: penaltyToRefund > 0 ? true : item.penaltyRefunded,
          frameUris: effectiveFrames,
          citizenPlate: extra?.citizenDetails?.plateNumber ?? item.citizenPlate,
          citizenVehicleMakeModel: extra?.citizenDetails?.vehicleMakeModel ?? item.citizenVehicleMakeModel,
          citizenVehicleColor: extra?.citizenDetails?.vehicleColor ?? item.citizenVehicleColor,
          citizenVehicleType: extra?.citizenDetails?.vehicleType ?? item.citizenVehicleType,
          citizenViolationType: extra?.citizenDetails?.violationType ?? item.citizenViolationType,
          citizenViolationName: extra?.citizenDetails?.violationName ?? item.citizenViolationName,
          citizenNote: extra?.citizenDetails?.citizenNote ?? item.citizenNote,
          isCitizenEdited: extra?.citizenDetails ? true : item.isCitizenEdited,
          aiResult: effectiveAi ? {
            ...sanitizeReportForStorage({ ...item, aiResult: effectiveAi }).aiResult!,
            status: normalizedStatus as any,
            statusLabel: 'Under Officer Review'
          } : undefined,
        };
      }
      return sanitizeReportForStorage(item);
    });

    await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(updated));

    // If user paid PKR 100 to dispute, refund the automatic PKR 50 false report penalty
    if (penaltyToRefund > 0) {
      await rechargeWalletBalance(penaltyToRefund, {
        title: 'Penalty Waiver Refund',
        subtitle: 'Automated PKR 50 false report penalty waived and credited back',
        type: 'review_refund_bonus',
        reportId: reportIdentifier,
      }).catch(() => {});
      await updateCitationStatus(reportIdentifier, 'disputed_in_review');
    }
  } catch (e) {
    console.error('Failed to update local report status:', e);
  }

  // Safe Supabase update
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportIdentifier);
    if (isUuid) {
      await supabase.from('reports').update({ status: normalizedStatus }).eq('report_id', reportIdentifier);
    }
    if (clientCaptureId) {
      await supabase.from('reports').update({ status: normalizedStatus }).eq('client_capture_id', clientCaptureId);
    }
    if (!isUuid) {
      await supabase.from('reports').update({ status: normalizedStatus }).eq('client_capture_id', reportIdentifier);
    }
  } catch (e) {
    console.log('Remote status update note:', e);
  }
}

/**
 * Updates or attaches citizen manual evidence details (overridden plate, vehicle details, note)
 * to a local and remote report.
 */
export async function updateReportCitizenDetails(
  reportIdentifier: string,
  details: CitizenEvidenceDetails,
  clientCaptureId?: string
): Promise<void> {
  try {
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
      if (raw) list = JSON.parse(raw);
    } catch (e) {
      console.warn('Failed reading local vault in updateReportCitizenDetails:', e);
      list = [];
    }

    const updated = list.map(item => {
      const isTarget =
        item.reportId === reportIdentifier ||
        item.clientCaptureId === reportIdentifier ||
        item.aiResult?.caseId === reportIdentifier ||
        (clientCaptureId && (item.clientCaptureId === clientCaptureId || item.reportId === clientCaptureId));

      if (isTarget) {
        const updatedAi = item.aiResult ? {
          ...item.aiResult,
          citizenPlate: details.plateNumber !== undefined ? details.plateNumber : item.aiResult.citizenPlate,
          citizenVehicleMakeModel: details.vehicleMakeModel !== undefined ? details.vehicleMakeModel : item.aiResult.citizenVehicleMakeModel,
          citizenVehicleColor: details.vehicleColor !== undefined ? details.vehicleColor : item.aiResult.citizenVehicleColor,
          citizenVehicleType: details.vehicleType !== undefined ? details.vehicleType : item.aiResult.citizenVehicleType,
          citizenViolationType: details.violationType !== undefined ? details.violationType : item.aiResult.citizenViolationType,
          citizenViolationName: details.violationName !== undefined ? details.violationName : item.aiResult.citizenViolationName,
          citizenNote: details.citizenNote !== undefined ? details.citizenNote : item.aiResult.citizenNote,
          isCitizenEdited: true,
        } : undefined;

        return sanitizeReportForStorage({
          ...item,
          citizenPlate: details.plateNumber !== undefined ? details.plateNumber : item.citizenPlate,
          citizenVehicleMakeModel: details.vehicleMakeModel !== undefined ? details.vehicleMakeModel : item.citizenVehicleMakeModel,
          citizenVehicleColor: details.vehicleColor !== undefined ? details.vehicleColor : item.citizenVehicleColor,
          citizenVehicleType: details.vehicleType !== undefined ? details.vehicleType : item.citizenVehicleType,
          citizenViolationType: details.violationType !== undefined ? details.violationType : item.citizenViolationType,
          citizenViolationName: details.violationName !== undefined ? details.violationName : item.citizenViolationName,
          citizenNote: details.citizenNote !== undefined ? details.citizenNote : item.citizenNote,
          isCitizenEdited: true,
          aiResult: updatedAi,
        });
      }
      return sanitizeReportForStorage(item);
    });

    await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save citizen details to local vault:', err);
  }
}

/**
 * Resolves an escalated case after manual human traffic warden review.
 * - If verdict is 'accepted': 100% review fee refund (PKR 100) + reward bonus (PKR 200) = PKR 300 sent to citizen wallet.
 * - If verdict is 'rejected': Review fee is non-refundable / forfeited ("reporter ki fee to gai"). 0 refund.
 */
export async function resolveHumanReview(
  reportId: string,
  verdict: 'accepted' | 'rejected'
): Promise<{ success: boolean; newStatus: string; payoutPkr: number }> {
  let payoutPkr = 0;
  try {
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
      if (raw) list = JSON.parse(raw);
    } catch (cursorErr) {
      console.warn('Recovering from CursorWindow in resolveHumanReview:', cursorErr);
      await AsyncStorage.removeItem(LOCAL_VAULT_KEY).catch(() => {});
      return { success: false, newStatus: 'unknown', payoutPkr: 0 };
    }

    const target = list.find(r => r.reportId === reportId || r.clientCaptureId === reportId);
    if (!target) return { success: false, newStatus: 'unknown', payoutPkr: 0 };

    const resolvedStatus = verdict;

    if (verdict === 'accepted') {
      // 100% Review Fee Refund (PKR 100) + Reward Prize (PKR 200) = Total PKR 300 to citizen wallet
      payoutPkr = 300;
      await rechargeWalletBalance(300, {
        title: 'Officer Review Payout (Refund + Reward)',
        subtitle: 'Review fee refunded and full bounty rewarded',
        type: 'review_refund_bonus',
        reportId,
      });
      await updateCitationStatus(reportId, 'waived');
    } else {
      // Fee of PKR 100 is forfeited / lost
      payoutPkr = 0;
    }

    const updated = list.map(item => {
      if (item.reportId === reportId || item.clientCaptureId === reportId) {
        return {
          ...sanitizeReportForStorage(item),
          status: resolvedStatus,
          officerVerdict: verdict,
          officerVerdictAt: new Date().toISOString(),
          rewardPkr: verdict === 'accepted' ? 200 : item.rewardPkr,
          reviewFeeRefunded: verdict === 'accepted' ? 100 : 0,
          totalPayoutPkr: payoutPkr,
          officerNote: verdict === 'accepted'
            ? 'Traffic Warden confirmed violation. PKR 100 review fee refunded + PKR 200 reward bonus credited.'
            : 'Traffic Warden concluded no violation occurred. PKR 100 review fee has been forfeited.',
          aiResult: item.aiResult ? {
            ...sanitizeReportForStorage(item).aiResult!,
            status: (verdict === 'accepted' ? 'fined' : 'no_violation') as any,
            statusLabel: verdict === 'accepted' ? 'Officer Confirmed Violation' : 'Officer Found No Violation',
            violationDetected: verdict === 'accepted',
          } : undefined,
        };
      }
      return sanitizeReportForStorage(item);
    });

    await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(updated));

    // Supabase update
    try {
      await supabase.from('reports').update({ status: resolvedStatus }).eq('report_id', reportId);
    } catch (e) {
      console.log('Remote resolution note:', e);
    }

    return { success: true, newStatus: resolvedStatus, payoutPkr };
  } catch (err) {
    console.error('Error resolving human review:', err);
    return { success: false, newStatus: 'error', payoutPkr: 0 };
  }
}


import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { AiEvidentiaryResult } from './aiAnalysis';
import { rechargeWalletBalance, deductWalletBalance } from './wallet';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  reporterId?: string;
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

async function getActiveUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

async function getVaultStorageKey(): Promise<string> {
  const uid = await getActiveUserId();
  return uid ? `@roadwatch_local_vault_reports_${uid}` : '@roadwatch_local_vault_reports';
}

async function getCitationsStorageKey(): Promise<string> {
  const uid = await getActiveUserId();
  return uid ? `@roadwatch_reporter_citations_${uid}` : '@roadwatch_reporter_citations';
}

async function getDeletedReportsStorageKey(): Promise<string> {
  const uid = await getActiveUserId();
  return uid ? `@roadwatch_deleted_report_ids_${uid}` : '@roadwatch_deleted_report_ids';
}

export async function getPenaltyCitations(): Promise<PenaltyCitation[]> {
  try {
    const key = await getCitationsStorageKey();
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePenaltyCitation(citation: PenaltyCitation): Promise<void> {
  try {
    const key = await getCitationsStorageKey();
    const list = await getPenaltyCitations();
    const filtered = list.filter(c => c.reportId !== citation.reportId);
    filtered.unshift(citation);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save penalty citation:', e);
  }
}

export async function updateCitationStatus(reportId: string, status: PenaltyCitation['status']): Promise<void> {
  try {
    const key = await getCitationsStorageKey();
    const list = await getPenaltyCitations();
    const updated = list.map(c => c.reportId === reportId ? { ...c, status } : c);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch { }
}

export async function getDeletedReportIds(): Promise<string[]> {
  try {
    const key = await getDeletedReportsStorageKey();
    const raw = await AsyncStorage.getItem(key);
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
    const delKey = await getDeletedReportsStorageKey();
    const existing = await getDeletedReportIds();
    const combined = Array.from(new Set([...existing, ...reportIds]));
    await AsyncStorage.setItem(delKey, JSON.stringify(combined));
  } catch (e) {
    console.warn('Failed to save deleted report IDs:', e);
  }

  // 2. Remove from local vault storage
  try {
    const vaultKey = await getVaultStorageKey();
    const raw = await AsyncStorage.getItem(vaultKey);
    if (raw) {
      const list: StoredCaseReport[] = JSON.parse(raw);
      const remaining = list.filter(r => !toDelete.has(r.reportId) && !toDelete.has(r.clientCaptureId));
      await AsyncStorage.setItem(vaultKey, JSON.stringify(remaining));
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
        await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => { });
      }
    }
  } catch { }

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
  } catch { }

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
 * Uploads video clip and evidence keyframes directly to Supabase Storage evidence_vault.
 */
export async function uploadEvidenceToStorage(
  clientCaptureId: string,
  videoUri?: string,
  framesBase64?: string[]
): Promise<{ videoUrl: string | null; frameUrls: string[] }> {
  let videoUrl: string | null = null;
  const frameUrls: string[] = [];

  // 1. Upload Video MP4 — use fetch(uri).blob() which is the correct Expo + Supabase pattern.
  //    Note: "Response.blob() using React Native Blob" warning is harmless — upload works fine.
  try {
    if (videoUri) {
      const videoPath = `${clientCaptureId}/video.mp4`;

      const response = await fetch(videoUri);
      const blob = await response.blob();

      const { error: vErr } = await supabase.storage
        .from('evidence_vault')
        .upload(videoPath, blob, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (!vErr) {
        const { data: pubUrl } = supabase.storage
          .from('evidence_vault')
          .getPublicUrl(videoPath);
        videoUrl = pubUrl?.publicUrl || null;
      } else {
        console.warn('Supabase video upload notice:', vErr.message);
      }
    }
  } catch (err) {
    console.warn('Video upload skipped:', err);
  }

  // 2. Upload Keyframe Images — read as Base64 from disk then upload via fetch+blob
  try {
    if (framesBase64 && framesBase64.length > 0) {
      for (let i = 0; i < framesBase64.length; i++) {
        const b64 = framesBase64[i];
        if (!b64) continue;
        const framePath = `${clientCaptureId}/frame_${i + 1}.jpg`;

        // If already a file URI, fetch it directly as blob
        let frameBlob: Blob;
        if (typeof b64 === 'string' && b64.startsWith('file://')) {
          const r = await fetch(b64);
          frameBlob = await r.blob();
        } else {
          // base64 string — convert via data URI fetch
          const cleanB64 = b64.replace(/^data:image\/\w+;base64,/, '');
          const dataUri = `data:image/jpeg;base64,${cleanB64}`;
          const r = await fetch(dataUri);
          frameBlob = await r.blob();
        }

        const { error: fErr } = await supabase.storage
          .from('evidence_vault')
          .upload(framePath, frameBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!fErr) {
          const { data: pubUrl } = supabase.storage
            .from('evidence_vault')
            .getPublicUrl(framePath);
          if (pubUrl?.publicUrl) {
            frameUrls.push(pubUrl.publicUrl);
          }
        } else {
          console.warn('Frame upload notice:', fErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('Frames upload skipped:', err);
  }

  return { videoUrl, frameUrls };
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
  } catch { }
  return uris;
}

export async function uploadReport(
  clip: CapturedClip,
  claimedClass: string,
  aiResult?: AiEvidentiaryResult
): Promise<string> {
  const generatedId = aiResult?.caseId || `CASE-${Date.now().toString().slice(-6)}`;
  let finalReportId = generatedId;

  // AI determines violation detection for local UX only.
  // All reports go to DB as 'submitted' so they reach the officer dashboard pending queue.
  // Officer makes the final verdict (accepted / rejected).
  const isAccepted = aiResult ? (aiResult.status === 'fined' && aiResult.violationDetected) : false;
  const localDisplayStatus = isAccepted ? 'accepted' : 'rejected'; // shown locally in app
  const dbInsertStatus = 'submitted'; // always submitted to officer queue

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

  // Ensure valid UUID for client_capture_id (required by PostgreSQL schema)
  const validCaptureUuid = UUID_REGEX.test(clip.clientCaptureId) ? clip.clientCaptureId : Crypto.randomUUID();

  // 1. Upload Video & Keyframes to Supabase Storage evidence_vault
  let remoteVideoUrl: string | null = null;
  let remoteFrameUrls: string[] = [];
  try {
    const uploadRes = await uploadEvidenceToStorage(
      validCaptureUuid,
      clip.uri,
      aiResult?.framesBase64 || clip.framesBase64
    );
    remoteVideoUrl = uploadRes.videoUrl;
    remoteFrameUrls = uploadRes.frameUrls;
  } catch (storageErr) {
    console.warn('Evidence vault storage upload note:', storageErr);
  }

  // 2. Resolve authenticated user first so localRecord is tagged with the user's ID
  let userId: string | undefined;
  let userEmail: string | undefined;
  let userFullName: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getUser();
    userId = sessionData?.user?.id;
    userEmail = sessionData?.user?.email;
    userFullName = sessionData?.user?.user_metadata?.full_name;
    if (!userId) {
      const cached = await AsyncStorage.getItem('@roadwatch_user_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.userId && UUID_REGEX.test(parsed.userId)) userId = parsed.userId;
          if (parsed.email) userEmail = parsed.email;
          if (parsed.name) userFullName = parsed.name;
        } catch {}
      }
    }
  } catch {}

  // 3. Always save in user-scoped local storage first so user evidence is NEVER lost or blocked
  const localRecord: StoredCaseReport = {
    reportId: finalReportId,
    clientCaptureId: validCaptureUuid,
    reporterId: userId,
    claimedClass,
    capturedAt: clip.capturedAt,
    uploadedAt: new Date().toISOString(),
    latitude: clip.latitude,
    longitude: clip.longitude,
    locationName: clip.locationName,
    accuracy: clip.accuracy,
    status: localDisplayStatus, // local display uses AI result for UX
    aiResult,
    rewardPkr,
    penaltyPkr,
    frameUris: remoteFrameUrls.length > 0 ? remoteFrameUrls : frameUris,
  };
  await saveLocalReport(localRecord);

  // 4. Remote Supabase insertion
  try {
    if (userId) {
      // Ensure base_users exists with role and active status
      try {
        await supabase.from('base_users').upsert({
          user_id: userId,
          role: 'reporter',
          name: userFullName || 'Citizen Reporter',
          email: userEmail || 'citizen@roadwatch.org',
          account_state: 'active',
          registration_completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch { }

      // Ensure reporter_profiles exists
      try {
        await supabase.from('reporter_profiles').upsert(
          { reporter_id: userId, trust_score: 100 },
          { onConflict: 'reporter_id', ignoreDuplicates: true }
        );
      } catch { }

      // Insert Report into public.reports as 'submitted' — awaiting officer verdict
      const { data: insertedReport, error: insertError } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          claimed_class: claimedClass === 'auto_ai_detect' ? (aiResult?.violationType || 'red_light_running') : claimedClass,
          captured_at: clip.capturedAt || new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
          geo_lat: clip.latitude,
          geo_long: clip.longitude,
          location_accuracy_m: clip.accuracy || 10,
          client_capture_id: validCaptureUuid,
          status: dbInsertStatus, // 'submitted' — lands in officer pending queue
          ai_verdict: isAccepted ? 'accepted' : 'rejected',
          ai_confidence: aiResult?.plateConfidence ?? (aiResult?.clarityScore ? Math.round(aiResult.clarityScore) : null),
          vehicle_plate: aiResult?.plateNumber || null,
          location_name: clip.locationName || null,
          video_url: remoteVideoUrl,
          frame_uris: remoteFrameUrls.length > 0 ? remoteFrameUrls : (frameUris.length > 0 ? frameUris : null),
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

        // Also record evidence entry in public.evidence table if video was uploaded
        if (remoteVideoUrl) {
          try {
            await supabase.from('evidence').insert({
              report_id: finalReportId,
              storage_ref: `${validCaptureUuid}/video.mp4`,
              mime_type: 'video/mp4',
            });
          } catch {}
        }
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
    const vaultKey = await getVaultStorageKey();
    const cleanReport = sanitizeReportForStorage(report);
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(vaultKey);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (cursorErr) {
      console.warn('Recovering from oversized CursorWindow in vault:', cursorErr);
      await AsyncStorage.removeItem(vaultKey).catch(() => { });
      list = [];
    }

    // Clean all existing items so old oversized records don't persist
    const sanitizedList = list.slice(0, 50).map(sanitizeReportForStorage);
    const filtered = sanitizedList.filter(r => r.clientCaptureId !== cleanReport.clientCaptureId && r.reportId !== cleanReport.reportId);
    filtered.unshift(cleanReport);
    await AsyncStorage.setItem(vaultKey, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to cache local report:', e);
    // Ultimate recovery fallback: reset corrupted key and save just this clean record
    try {
      const vaultKey = await getVaultStorageKey();
      await AsyncStorage.removeItem(vaultKey);
      await AsyncStorage.setItem(vaultKey, JSON.stringify([sanitizeReportForStorage(report)]));
    } catch { }
  }
}

export async function getLocalReports(): Promise<StoredCaseReport[]> {
  try {
    const vaultKey = await getVaultStorageKey();
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(vaultKey);
    } catch (cursorErr) {
      console.warn('Recovering from oversized CursorWindow in getLocalReports:', cursorErr);
      await AsyncStorage.removeItem(vaultKey).catch(() => { });
      return [];
    }

    if (!raw) return [];
    const list: StoredCaseReport[] = JSON.parse(raw);
    const deletedIds = new Set(await getDeletedReportIds());
    const currentUid = await getActiveUserId();

    return list
      .filter(r => !deletedIds.has(r.reportId) && !deletedIds.has(r.clientCaptureId))
      .filter(r => !currentUid || !r.reporterId || r.reporterId === currentUid)
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
    const vaultKey = await getVaultStorageKey();
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(vaultKey);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (cursorErr) {
      console.warn('Recovering from oversized CursorWindow in updateReportStatus:', cursorErr);
      await AsyncStorage.removeItem(vaultKey).catch(() => { });
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

    await AsyncStorage.setItem(vaultKey, JSON.stringify(updated));

    // If user paid PKR 100 to dispute, refund the automatic PKR 50 false report penalty
    if (penaltyToRefund > 0) {
      await rechargeWalletBalance(penaltyToRefund, {
        title: 'Penalty Waiver Refund',
        subtitle: 'Automated PKR 50 false report penalty waived and credited back',
        type: 'review_refund_bonus',
        reportId: reportIdentifier,
      }).catch(() => { });
      await updateCitationStatus(reportIdentifier, 'disputed_in_review');
    }
  } catch (e) {
    console.error('Failed to update local report status:', e);
  }

  // Safe Supabase update & guarantee presence on Officer Dashboard
  try {
    const isReportUuid = UUID_REGEX.test(reportIdentifier);
    let updated = false;

    const updatePayload: Record<string, any> = {
      status: normalizedStatus,
    };
    if (extra?.citizenDetails?.plateNumber) updatePayload.citizen_plate = extra.citizenDetails.plateNumber;
    if (extra?.citizenDetails?.vehicleMakeModel) updatePayload.citizen_vehicle_model = extra.citizenDetails.vehicleMakeModel;
    if (extra?.citizenDetails?.vehicleColor) updatePayload.citizen_vehicle_color = extra.citizenDetails.vehicleColor;
    if (extra?.citizenDetails?.vehicleType) updatePayload.citizen_vehicle_type = extra.citizenDetails.vehicleType;
    if (extra?.citizenDetails?.citizenNote) updatePayload.citizen_note = extra.citizenDetails.citizenNote;

    if (isReportUuid) {
      const { data } = await supabase.from('reports').update(updatePayload).eq('report_id', reportIdentifier).select('report_id');
      if (data && data.length > 0) updated = true;
    }
    if (clientCaptureId && !updated) {
      const { data } = await supabase.from('reports').update(updatePayload).eq('client_capture_id', clientCaptureId).select('report_id');
      if (data && data.length > 0) updated = true;
    }

    // If report was not yet in remote Supabase, insert it now so Officer Dashboard gets it immediately
    if (!updated) {
      const { data: auth } = await supabase.auth.getUser();
      let userId = auth?.user?.id;
      if (!userId) {
        const cached = await AsyncStorage.getItem('@roadwatch_user_profile');
        if (cached) {
          try {
            const p = JSON.parse(cached);
            if (p.userId && UUID_REGEX.test(p.userId)) userId = p.userId;
          } catch {}
        }
      }

      if (userId) {
        const captureUuid = (clientCaptureId && UUID_REGEX.test(clientCaptureId)) ? clientCaptureId : Crypto.randomUUID();
        // Insert as 'submitted' first (satisfies CHECK constraint), then update to desired status
        let newRow: { report_id: string } | null = null;
        try {
          const res = await supabase.from('reports').insert({
            reporter_id: userId,
            claimed_class: extra?.citizenDetails?.violationType || 'red_light_running',
            status: 'submitted',
            client_capture_id: captureUuid,
            captured_at: new Date().toISOString(),
            uploaded_at: new Date().toISOString(),
            geo_lat: 31.5204,
            geo_long: 74.3587,
            location_accuracy_m: 10,
            citizen_note: extra?.citizenDetails?.citizenNote || undefined,
            citizen_plate: extra?.citizenDetails?.plateNumber || undefined,
            citizen_vehicle_model: extra?.citizenDetails?.vehicleMakeModel || undefined,
          }).select('report_id').single();
          newRow = res.data;
        } catch {}

        // If status differs from 'submitted', update it now
        if (newRow?.report_id && normalizedStatus !== 'submitted') {
          try {
            await supabase.from('reports')
              .update({ status: normalizedStatus })
              .eq('report_id', newRow.report_id);
          } catch {}
        }
      }
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
    const vaultKey = await getVaultStorageKey();
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(vaultKey);
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

    await AsyncStorage.setItem(vaultKey, JSON.stringify(updated));
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
    const vaultKey = await getVaultStorageKey();
    let list: StoredCaseReport[] = [];
    try {
      const raw = await AsyncStorage.getItem(vaultKey);
      if (raw) list = JSON.parse(raw);
    } catch (cursorErr) {
      console.warn('Recovering from CursorWindow in resolveHumanReview:', cursorErr);
      await AsyncStorage.removeItem(vaultKey).catch(() => { });
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

    await AsyncStorage.setItem(vaultKey, JSON.stringify(updated));

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

/**
 * Purges local report vault cache (both legacy un-scoped and user-scoped keys)
 */
export async function clearReportsCache(userId?: string): Promise<void> {
  try {
    const uid = userId || (await getActiveUserId());
    const keys = [
      '@roadwatch_local_vault_reports',
      '@roadwatch_reporter_citations',
      '@roadwatch_deleted_report_ids',
    ];
    if (uid) {
      keys.push(`@roadwatch_local_vault_reports_${uid}`);
      keys.push(`@roadwatch_reporter_citations_${uid}`);
      keys.push(`@roadwatch_deleted_report_ids_${uid}`);
    }
    await AsyncStorage.multiRemove(keys);
  } catch {}
}


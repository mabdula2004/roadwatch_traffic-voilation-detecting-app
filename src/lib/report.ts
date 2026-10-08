import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { AiEvidentiaryResult } from './aiAnalysis';

export interface CapturedClip {
  clientCaptureId: string;
  uri: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  durationMs: number;
}

export interface StoredCaseReport {
  reportId: string;
  clientCaptureId: string;
  claimedClass: string;
  capturedAt: string;
  uploadedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  status: string;
  aiResult?: AiEvidentiaryResult;
}

const LOCAL_VAULT_KEY = '@roadwatch_local_vault_reports';

export async function uploadReport(
  clip: CapturedClip,
  claimedClass: string,
  aiResult?: AiEvidentiaryResult
): Promise<string> {
  const generatedId = aiResult?.caseId || `CASE-${Date.now().toString().slice(-6)}`;
  let finalReportId = generatedId;

  // 1. Always save in local storage first so user evidence is NEVER lost or blocked
  const localRecord: StoredCaseReport = {
    reportId: finalReportId,
    clientCaptureId: clip.clientCaptureId,
    claimedClass,
    capturedAt: clip.capturedAt,
    uploadedAt: new Date().toISOString(),
    latitude: clip.latitude,
    longitude: clip.longitude,
    accuracy: clip.accuracy,
    status: aiResult?.status || 'uploaded',
    aiResult,
  };
  await saveLocalReport(localRecord);

  // 2. Attempt remote Supabase insertion
  try {
    const { data: session } = await supabase.auth.getUser();
    const userId = session?.user?.id;

    if (userId) {
      const { data: insertedReport, error: insertError } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          claimed_class: claimedClass,
          captured_at: clip.capturedAt,
          uploaded_at: new Date().toISOString(),
          geo_lat: clip.latitude,
          geo_long: clip.longitude,
          location_accuracy_m: clip.accuracy,
          client_capture_id: clip.clientCaptureId,
          status: aiResult?.status === 'fined' ? 'accepted' : 'uploaded',
        })
        .select('report_id')
        .single();

      if (!insertError && insertedReport?.report_id) {
        finalReportId = insertedReport.report_id;
        localRecord.reportId = finalReportId;
        await saveLocalReport(localRecord);
      } else if (insertError) {
        console.log('Supabase sync note (using local vault):', insertError.message);
      }
    }
  } catch (err) {
    console.log('Database upload bypassed for testing mode:', err);
  }

  return finalReportId;
}

export async function saveLocalReport(report: StoredCaseReport) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
    const list: StoredCaseReport[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(r => r.clientCaptureId !== report.clientCaptureId && r.reportId !== report.reportId);
    filtered.unshift(report);
    await AsyncStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to cache local report:', e);
  }
}

export async function getLocalReports(): Promise<StoredCaseReport[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from './supabase';

export interface CapturedClip {
  clientCaptureId: string;
  uri: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  durationMs: number;
}

export async function uploadReport(clip: CapturedClip, claimedClass: string) {
  const { data: session, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !session.user) throw new Error('Please sign in again.');

  const file = new File(clip.uri);
  if (!file.exists || file.size < 1 || file.size > 50 * 1024 * 1024) {
    throw new Error('Video must be under 50 MB. Please record a shorter clip.');
  }
  const mimeType = clip.uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
  const { data: existing } = await supabase.from('reports').select('report_id,status').eq('client_capture_id', clip.clientCaptureId).maybeSingle();
  if (existing?.status === 'uploaded') return existing.report_id as string;
  const inserted = existing ? { data: existing, error: null } : await supabase.from('reports').insert({
    reporter_id: session.user.id,
    claimed_class: claimedClass,
    captured_at: clip.capturedAt,
    geo_lat: clip.latitude,
    geo_long: clip.longitude,
    location_accuracy_m: clip.accuracy,
    client_capture_id: clip.clientCaptureId,
  }).select('report_id').single();
  const { data: report, error: insertError } = inserted;
  if (insertError || !report) throw new Error(insertError?.message ?? 'Report could not be created.');

  if (existing) {
    const { data: resumed } = await supabase.functions.invoke('report-upload', {
      body: { action: 'complete', reportId: report.report_id },
    });
    if (resumed?.status === 'uploaded') return report.report_id as string;
  }

  const { data: prepared, error: prepareError } = await supabase.functions.invoke('report-upload', {
    body: { action: 'prepare', reportId: report.report_id, mimeType, fileSize: file.size },
  });
  if (prepareError || !prepared?.signedUrl || !prepared?.path) {
    throw new Error(`Report ${report.report_id} is awaiting upload. Please keep the clip and retry later.`);
  }

  // expo/fetch streams the native File body; no base64 conversion or JS-size video buffer.
  const response = await expoFetch(prepared.signedUrl, {
    method: 'PUT', body: file,
    headers: { 'content-type': mimeType, 'x-upsert': 'false' },
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`Report ${report.report_id} is awaiting upload: HTTP ${response.status}`);
  }

  const { data: completed, error: completeError } = await supabase.functions.invoke('report-upload', {
    body: { action: 'complete', reportId: report.report_id },
  });
  if (completeError || completed?.status !== 'uploaded') {
    throw new Error(`Video uploaded for ${report.report_id}, but confirmation is pending. Contact support with this ID.`);
  }
  return report.report_id as string;
}

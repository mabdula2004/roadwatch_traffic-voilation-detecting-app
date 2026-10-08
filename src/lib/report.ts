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

  // 1. Check if report already exists
  const { data: existing } = await supabase
    .from('reports')
    .select('report_id,status')
    .eq('client_capture_id', clip.clientCaptureId)
    .maybeSingle();

  if (existing?.status === 'uploaded' || existing?.status === 'accepted') {
    return existing.report_id as string;
  }

  // 2. Insert report directly into Supabase 'reports' table
  let reportId = existing?.report_id;
  if (!reportId) {
    const { data: insertedReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        reporter_id: session.user.id,
        claimed_class: claimedClass,
        captured_at: clip.capturedAt,
        uploaded_at: new Date().toISOString(),
        geo_lat: clip.latitude,
        geo_long: clip.longitude,
        location_accuracy_m: clip.accuracy,
        client_capture_id: clip.clientCaptureId,
        status: 'uploaded',
      })
      .select('report_id')
      .single();

    if (insertError || !insertedReport) {
      throw new Error(insertError?.message ?? 'Report could not be created in database.');
    }
    reportId = insertedReport.report_id;
  }

  // 3. Try storage bucket upload if edge function/bucket is active
  try {
    const { data: prepared } = await supabase.functions.invoke('report-upload', {
      body: { action: 'prepare', reportId, mimeType, fileSize: file.size },
    });
    if (prepared?.signedUrl) {
      await expoFetch(prepared.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': mimeType, 'x-upsert': 'false' },
      });
      await supabase.functions.invoke('report-upload', {
        body: { action: 'complete', reportId },
      });
    }
  } catch (err) {
    console.log('Storage upload note:', err);
    // Report record is already secured in database
  }

  return reportId;
}

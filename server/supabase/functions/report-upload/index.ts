import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const BUCKET = 'evidence_vault';
const MAX_BYTES = 50 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const bearer = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return reply({ error: 'Sign in required' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publicKey || !secret) return reply({ error: 'Server configuration unavailable' }, 503);
  const userClient = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
  const { data: auth, error: authError } = await userClient.auth.getUser(bearer);
  if (authError || !auth.user) return reply({ error: 'Session expired' }, 401);

  let input: { action?: string; reportId?: string; mimeType?: string; fileSize?: number };
  try { input = await req.json(); } catch { return reply({ error: 'Invalid request' }, 400); }
  if (!input.reportId || !UUID.test(input.reportId)) return reply({ error: 'Invalid report ID' }, 400);

  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data: account } = await admin.from('base_users')
    .select('account_state,role').eq('user_id', auth.user.id).single();
  if (account?.account_state !== 'active' || account?.role !== 'reporter') {
    return reply({ error: 'Reporter account is not active' }, 403);
  }
  const { data: report, error: reportError } = await admin.from('reports')
    .select('report_id, reporter_id, status').eq('report_id', input.reportId).single();
  if (reportError || !report || report.reporter_id !== auth.user.id) return reply({ error: 'Report not found' }, 404);
  if (report.status !== 'awaiting_upload') return reply({ error: 'Report is no longer awaiting upload' }, 409);

  if (input.action === 'prepare') {
    if (!Number.isInteger(input.fileSize) || input.fileSize! < 1 || input.fileSize! > MAX_BYTES ||
      !['video/mp4', 'video/quicktime'].includes(input.mimeType || '')) {
      return reply({ error: 'Use a video under 50 MB' }, 400);
    }
    const extension = input.mimeType === 'video/quicktime' ? 'mov' : 'mp4';
    const path = `${auth.user.id}/${report.report_id}/original.${extension}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return reply({ error: 'Could not prepare upload' }, 500);
    return reply({ path, signedUrl: data.signedUrl });
  }

  if (input.action === 'complete') {
    const { data: listed, error: listError } = await admin.storage.from(BUCKET)
      .list(`${auth.user.id}/${report.report_id}`, { limit: 10 });
    if (listError) return reply({ error: 'Could not verify upload' }, 503);
    const file = listed?.find((entry) => entry.name === 'original.mp4' || entry.name === 'original.mov');
    if (!file) return reply({ error: 'Upload has not reached the vault yet' }, 409);
    const size = Number(file.metadata?.size ?? 0);
    if (size < 1 || size > MAX_BYTES) return reply({ error: 'Invalid uploaded file size' }, 400);
    const path = `${auth.user.id}/${report.report_id}/${file.name}`;
    const { error: evidenceError } = await admin.from('evidence').insert({
      report_id: report.report_id, storage_ref: path, sha256_hash: null,
      file_size_bytes: size,
      mime_type: file.name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4',
    });
    if (evidenceError && evidenceError.code !== '23505') return reply({ error: 'Could not record evidence' }, 500);
    const { error: updateError } = await admin.from('reports')
      .update({ status: 'uploaded', uploaded_at: new Date().toISOString() })
      .eq('report_id', report.report_id).eq('status', 'awaiting_upload');
    if (updateError) return reply({ error: 'Could not finalize report' }, 500);
    return reply({ reportId: report.report_id, status: 'uploaded' });
  }
  return reply({ error: 'Unknown action' }, 400);
});

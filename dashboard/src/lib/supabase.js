import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fwofgstzgkhtfzxeangb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_swxR96V85G50zJMLXR-v4g__Bz_BasH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

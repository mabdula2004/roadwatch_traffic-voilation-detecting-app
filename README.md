# RoadWatch — original native design with Supabase

The original React Native screen structure is retained: three-card onboarding, live capture HUD, review card, vault tabs, wallet, safety, settings, profile, and plate search. Sample balances, violations, government verification and notifications have been removed from active screens. Data shown in the app comes from the signed-in reporter's Supabase records.

## Run

1. Install Node.js 22+, then extract this archive and open a terminal in `roadwatch`.
2. Run `npm ci` and `npx expo start --clear`.
3. Open it with Expo Go on a physical iPhone or Android phone. The phone and computer should be on the same network; `npx expo start --tunnel` can be used if local discovery fails.
4. Register in the original onboarding layout: full name, 13-digit CNIC, Pakistani phone; email and vehicle plate are optional. Tap **Verify phone**, enter the actual SMS code, tap **Confirm code**, accept the safety agreement, then **Create Account & Start**.
5. Safely stop before recording. Allow camera, microphone and location. Record a clip, review it, choose what you saw, and submit to the private vault. Visit Vault, Wallet, Safety and Settings to inspect your own current data.

## Phone OTP setup

Supabase Auth must have the **Phone** provider enabled and a working SMS gateway configured. The app sends and confirms real Supabase OTP codes; it shows the provider's actual error if SMS cannot be sent. An SMS provider is an external service and was not configured or tested by this archive. Test delivery with a real phone number before relying on onboarding.

The included `.env` contains only the Supabase project URL and a **public publishable key**. Never put a service role, OpenRouter, or SMS provider secret in an `EXPO_PUBLIC_` variable or the ZIP.

## Connected behavior

- Phone OTP signs in using Supabase Auth. Account completion is a protected RPC that requires the Auth phone to be confirmed. Raw CNIC is not persisted: a keyed digest and last four digits are stored; this is not NADRA verification. Email is self supplied and optional.
- The original camera HUD uses the actual device camera, current date/time and capture GPS. Recordings stop at ten seconds or 50 MB. Reticle is a framing guide, not live plate OCR.
- The original review layout plays the real video. A selected violation is a reporter claim, not an AI verdict. Upload uses the existing JWT-protected Edge Function and a report-specific signed URL for the private bucket.
- Vault reads only the reporter's rows under RLS and refreshes every 12 seconds. The “sealed” tab shows server-uploaded reports, while its status explicitly says analysis is pending where applicable. The pending tab shows server-side awaiting/failed rows; it does not claim to keep a durable offline upload queue.
- Wallet reads real reward balance/pending clearance. Settings reads reporter profile, trust score and own report outcomes. Profile edits and language/theme preferences are saved to Supabase. Logout is real.
- Safety retains the original SOS and quick-call layout. SOS opens a confirmation and dials 1122; quick buttons dial 15 or 1122. It does not share location or video. Plate search keeps its screen design but clearly states that the government registry is not connected.

## Pending production connections

AI/video classification, plate OCR, face blur, trusted evidence hash, robust upload retry queue, identity registry, government citations, police review, citizen appeal and reward withdrawal are not active. No automated fine is issued by this mobile app. The previous sample notifications and fines do not appear as real records. The password form remains visible in the existing navigation but clearly states this account uses phone OTP and cannot change a password in this build.

The database migrations in `supabase/migrations/` and `report-upload` Edge Function have already been applied/deployed to the connected Supabase project; do not rerun them against the same project. `src/lib/supabase.ts` creates the mobile client and `src/lib/report.ts` manages capture upload. The `*.native.tsx` files are the mobile screens. Web/desktop design source is retained but is outside this mobile integration.

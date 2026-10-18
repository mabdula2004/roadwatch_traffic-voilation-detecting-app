# RoadWatch — Vercel deployment

Use two projects for this repository. The dashboard's existing Supabase integration and the mobile application's native structure are preserved.

| Setting | Reporting app web preview | Officer dashboard |
| --- | --- | --- |
| Suggested project name | roadwatch-app | roadwatch-dashboard |
| Team | abdula5 | abdula5 |
| Root directory | app | dashboard |
| Framework | Other | Vite |
| Install | npm ci | npm ci |
| Build | npm run build:web | npm run build |
| Output | dist | dist |

Each directory contains its own `vercel.json`. Import this repository using a Vercel GitHub integration that can access it, then select the deployment branch. Main was not modified by this preparation.

## Reporting app environment

Set the following variables in the app project's intended deployment environment:

- `EXPO_PUBLIC_SUPABASE_URL`: existing Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: existing public publishable key. Never use a service-role key.
- `OPENROUTER_API_KEY`: a newly issued server-side provider key. Revoke the previously embedded client key in OpenRouter; earlier repository history contains it.
- Optional `AI_MODEL`: defaults to `qwen/qwen3-vl-8b-instruct`.
- For native Android/iOS builds, set `EXPO_PUBLIC_AI_ENDPOINT` to `https://<app-deployment-domain>/api/analyze`. The browser uses its own origin automatically.

The API directory has an explicit ES-module package boundary so Vercel can load the compiled function without changing the mobile app build configuration. The AI proxy verifies the Supabase access token, restricts the request payload, chooses its model and token cap on the server, and keeps provider credentials out of client bundles. Without a server key it responds with an explicit 503. Existing native two-stage analysis remains unchanged apart from transport through this endpoint.

The web version is a preview of the reporting application. Video recording, video thumbnail extraction and native evidence file handling are not supported by this preview. The record control is disabled in browsers. Use the Android/iOS app for evidence recording.

## Dashboard environment and access

The existing public Supabase URL/key defaults are retained. They may be overridden with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time. No database migration or access-policy relaxation was applied.

The current dashboard has no sign-in flow. The inspected live database permits reporters to read only their own records and does not grant anonymous report access. A public dashboard build therefore does not establish officer access or a working review/reward workflow. Officer authentication and appropriate backend authorization must be implemented and verified separately. Do not apply the repository's unrestricted `using (true)` policy migration simply to make data appear.

## Validation

```sh
cd app
npm ci
npm run test:api
npm run build:web
cd ../dashboard
npm ci
npm run build
```

Build validation is separate from deployed end-to-end verification. SMS/email registration, native recording, real AI provider calls, officer authorization and Vercel routing must still be tested in their actual deployment environments.

## Production deployments — 18 October 2026

Both projects were published under the `abdula5` team from uploaded source snapshots of this deployment branch. The browser dashboard created the projects; the API module fix was then deployed to the existing app project by its verified project ID.

- Reporting application web preview: https://roadwatch-app-psi.vercel.app/
- Officer dashboard: https://roadwatch-dashboard-eight.vercel.app/

The reporting app's configured production deployment is `dpl_Ha2CYz15ujf9FwPib68uMjsdBXMG`. Its two public Supabase environment variables are saved for Production. The AI provider server key has not been supplied; AI analysis remains unavailable until a newly issued server key is configured.

Both live frontends were opened and visually verified in the browser. This does not certify registration, native evidence capture, AI analysis or officer adjudication end to end. The dashboard's authentication/authorization limitations above remain relevant.

These are direct upload deployments. They are not connected to automatic GitHub deployments. Future changes require a fresh source upload/redeployment, or an explicitly configured Vercel Git integration for this repository.

Production HTTP checks passed: both frontends return 200; `/api/analyze` rejects GET with 405 and returns an explicit 503 for POST while the server provider key is absent. The previous module-loading 500 is resolved.

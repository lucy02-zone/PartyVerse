# Online Mafia Supabase setup

Online Mafia is a separate mode from the device-pass local game. Browser clients authenticate with Supabase Anonymous Auth and call the `mafia` Edge Function. The function verifies the Supabase user token, generates room codes and shuffled roles with Web Crypto, and invokes the service-role-only `mafia_command` Postgres state machine. The database serializes commands by room row lock and validates membership, readiness, role permissions, phase, living status, target membership, duplicate submissions, resolution and win conditions in one transaction.

The Realtime publication contains only `mafia_rooms` and `mafia_room_players`. Both tables contain public lobby/game state only and are readable by authenticated room members under RLS. Account-to-player mappings, roles, detective results, night actions and votes have no client table grants or read policies. `mafia_command` is not executable by `anon` or `authenticated`; only the Edge Function service role can call it. The function returns an authorized per-player projection and exposes full roles only to room members after the game ends.

Lobby removal and vote deadlines are added by the forward-only migration `20261025000300_mafia_room_controls_and_vote_deadline.sql`. The migration stores room-scoped removal bans, locks the room row during host removals, and stores a 15-second deadline on each day phase. The Edge Function checks expired deadlines on authenticated room requests; the database resolver locks the room and resolves once. A late-vote trigger rejects submissions at or after the deadline. Timeout policy counts submitted votes and treats missing votes as abstentions; a tie or no votes eliminates nobody.

## Configure a Supabase project

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These are browser-safe project settings. Never put a service-role key in a `VITE_` variable or frontend file.
2. In Supabase Dashboard, open **Authentication → Sign In / Providers → Anonymous Sign-Ins** (the exact label may vary by Dashboard version) and enable anonymous sign-ins. The observed `422 anonymous_provider_disabled` error is returned by `auth.signInAnonymously()` when this provider is disabled; it is a project Auth configuration error, not a room-code or Edge Function error. The client detects this response and displays a plain unavailable state while keeping local Mafia available. No full account is required. For local Supabase, `config.toml` enables `auth.enable_anonymous_sign_ins = true`; this does not change the hosted project's setting. Each browser's persisted Auth session identifies the device for reconnection.
3. Install the Supabase CLI, authenticate, link this repository to the intended project, and review all migrations before applying them with `supabase db push`. The second migration revokes direct browser execution of the private snapshot projection; apply it even if the original migration is already present.
4. Deploy the function with the CLI commands below. The gateway JWT check is disabled for this one function so unauthenticated browser `OPTIONS` preflights can reach the handler; all `POST` commands still require a bearer token validated with Supabase Auth `getUser`, followed by server-side room and role authorization. Never remove those checks.
5. Run the SQL security and state-machine suites with `supabase test db`. These verify RLS, client table grants, safe Realtime row shapes, RPC execution grants, host removal, rejoin blocking, persisted deadlines, late-vote rejection, idempotent timeout resolution, partial votes, ties, no votes, and timeout win checks.
6. In a non-production Supabase project, manually verify two different anonymous sessions can create/join, ready, start, reveal only their own role, submit role actions/votes, and reconnect by room code after reload.

## Production frontend environment (Vercel)

The previously shared production hostname uses `vercel.app`. This repository has no checked-in Vercel project manifest or linked project metadata, so its Vercel project settings cannot be verified here. In the Vercel project dashboard, open **Settings → Environment Variables** and configure these exact build-time variables for **Production** (and **Preview** if preview deployments should support Online Mafia):

- `VITE_SUPABASE_URL` — the Supabase project's public HTTPS URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the Supabase publishable key (or legacy anon public key).

Save the values and create a fresh deployment so Vite embeds the new public configuration into the site bundle. Do not configure a service-role/secret key under either name or in any `VITE_` variable. The frontend validates these settings before enabling room creation/joining and displays a friendly unavailable state otherwise. A deployment is not verified until a fresh Vercel deployment is tested against the configured Supabase project.

## Edge Function CORS and deployment verification

The function accepts these exact browser origins by default: `http://localhost:5173`, `http://127.0.0.1:5173`, and `https://partyverse-gules.vercel.app`. Additional exact origins can be supplied as the comma-separated server-only Edge Function variable `MAFIA_ALLOWED_ORIGINS`. Do not add paths or trailing slashes. The function does not use wildcard origins or credentialed CORS.

Run from the repository root after installing and authenticating the Supabase CLI. Replace the placeholder with the project's reference (do not put a service-role key in a command):

```sh
supabase link --project-ref <project-ref>
supabase db push --project-ref <project-ref>
supabase functions deploy mafia --project-ref <project-ref> --no-verify-jwt
```

`supabase/config.toml` sets `verify_jwt = false` for this function to let the preflight reach its immediate `OPTIONS` response. This is not anonymous access to game actions: the handler rejects missing/invalid bearer tokens before parsing commands, then uses the authenticated user ID for authorization and the database state machine. Review this distinction before deploying.

Start the local Supabase stack and function with `supabase start` and `supabase functions serve mafia`. In a second terminal, verify the local preflight:

```sh
curl -i -X OPTIONS http://127.0.0.1:54321/functions/v1/mafia \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization, apikey, content-type, x-client-info'
```

Expect `204`, `Access-Control-Allow-Origin: http://localhost:5173`, methods `POST, OPTIONS`, and allowed headers including all four requested headers. Verify an unlisted origin gets a non-success response and no `Access-Control-Allow-Origin`. Then test an authenticated create/join through the app; preflight success alone does not prove the function or database is deployed correctly.

Repeat the preflight against `https://<project-ref>.supabase.co/functions/v1/mafia` with `Origin: https://partyverse-gules.vercel.app`, then test an authenticated game flow on the deployed site. A 404 indicates the function is missing or the project URL is wrong; a 503 may be a boot/import failure or the handler's missing server configuration; a 401/403 may be a stale gateway configuration or an unlisted origin. Check `sb-error-code` and Supabase **Functions → Logs** to distinguish platform responses from handler responses.

## Current verification boundary

The repository includes the migration, server function, SQL permission/RLS tests, and frontend. They are not applied or deployed by this repository. A successful frontend build alone does not establish a working or secure online game. The Supabase CLI and a linked project were unavailable in the implementation environment, so the migration and `supabase test db` suite still need to be run against a Supabase test project before enabling this mode for players.

Disconnected players remain in the game and the round waits for their action; the original authenticated browser can reconnect and resume. There is no timeout-based elimination, room cleanup job, host-transfer flow, or abuse/rate-limiting policy yet. The local Mafia mode remains available independently.

# Online Mafia Supabase setup

Online Mafia is a separate mode from the device-pass local game. Browser clients authenticate with Supabase Anonymous Auth and call the `mafia` Edge Function. The function verifies the Supabase user token, generates room codes and shuffled roles with Web Crypto, and invokes the service-role-only `mafia_command` Postgres state machine. The database serializes commands by room row lock and validates membership, readiness, role permissions, phase, living status, target membership, duplicate submissions, resolution and win conditions in one transaction.

The Realtime publication contains only `mafia_rooms` and `mafia_room_players`. Both tables contain public lobby/game state only and are readable by authenticated room members under RLS. Account-to-player mappings, roles, detective results, night actions and votes have no client table grants or read policies. `mafia_command` is not executable by `anon` or `authenticated`; only the Edge Function service role can call it. The function returns an authorized per-player projection and exposes full roles only to room members after the game ends.

## Configure a Supabase project

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These are browser-safe project settings. Never put a service-role key in a `VITE_` variable or frontend file.
2. In Supabase Dashboard, open **Authentication → Sign In / Providers → Anonymous Sign-Ins** (the exact label may vary by Dashboard version) and enable anonymous sign-ins. The observed `422 anonymous_provider_disabled` error is returned by `auth.signInAnonymously()` when this provider is disabled; it is a project Auth configuration error, not a room-code or Edge Function error. The client detects this response and gives setup instructions instead of showing a generic connection failure. No full account is required. For local Supabase, `config.toml` enables `auth.enable_anonymous_sign_ins = true`; this does not change the hosted project's setting. Each browser's persisted Auth session identifies the device for reconnection.
3. Install the Supabase CLI, authenticate, link this repository to the intended project, and review both migrations before applying them with `supabase db push`. The second migration revokes direct browser execution of the private snapshot projection; apply it even if the original migration is already present.
4. Deploy the function with `supabase functions deploy mafia`. Keep JWT verification enabled (`config.toml`); the hosted function receives its Supabase URL and service-role credential from the Supabase runtime environment.
5. Run the SQL security suite with `supabase test db`. The test suite verifies RLS, client table grants, safe Realtime row shapes, and RPC execution grants.
6. In a non-production Supabase project, manually verify two different anonymous sessions can create/join, ready, start, reveal only their own role, submit role actions/votes, and reconnect by room code after reload.

## Current verification boundary

The repository includes the migration, server function, SQL permission/RLS tests, and frontend. They are not applied or deployed by this repository. A successful frontend build alone does not establish a working or secure online game. The Supabase CLI and a linked project were unavailable in the implementation environment, so the migration and `supabase test db` suite still need to be run against a Supabase test project before enabling this mode for players.

Disconnected players remain in the game and the round waits for their action; the original authenticated browser can reconnect and resume. There is no timeout-based elimination, room cleanup job, host-transfer flow, or abuse/rate-limiting policy yet. The local Mafia mode remains available independently.

-- Existing deployments may already have created this SECURITY DEFINER helper.
-- It accepts a user id and returns private role/investigation data, so it must
-- never be callable through PostgREST by browser roles.
revoke all on function public.mafia_snapshot(uuid, uuid) from public, anon, authenticated;

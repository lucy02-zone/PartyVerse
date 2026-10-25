begin;
select plan(21);

select ok((select relrowsecurity from pg_class where oid = 'public.mafia_rooms'::regclass), 'room rows have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mafia_room_players'::regclass), 'public roster rows have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mafia_room_memberships'::regclass), 'identity mapping has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mafia_private_roles'::regclass), 'private roles have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mafia_night_actions'::regclass), 'night actions have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mafia_day_votes'::regclass), 'votes have RLS enabled');

select ok(not has_table_privilege('anon', 'public.mafia_private_roles', 'SELECT'), 'anon cannot read roles');
select ok(not has_table_privilege('authenticated', 'public.mafia_private_roles', 'SELECT'), 'players cannot read the role table');
select ok(not has_table_privilege('authenticated', 'public.mafia_night_actions', 'SELECT'), 'players cannot read secret actions');
select ok(not has_table_privilege('authenticated', 'public.mafia_day_votes', 'SELECT'), 'players cannot read private votes');
select ok(not has_table_privilege('authenticated', 'public.mafia_room_memberships', 'SELECT'), 'players cannot read account-to-player mappings');
select ok(not has_table_privilege('authenticated', 'public.mafia_private_roles', 'INSERT'), 'players cannot write roles');
select ok(not has_table_privilege('authenticated', 'public.mafia_night_actions', 'INSERT'), 'players cannot write night actions directly');
select ok(not has_table_privilege('authenticated', 'public.mafia_day_votes', 'INSERT'), 'players cannot write votes directly');
select ok(not exists (select 1 from pg_attribute where attrelid = 'public.mafia_rooms'::regclass and attname = 'host_user_id' and not attisdropped), 'Realtime room rows contain no host auth id');
select ok(not exists (select 1 from pg_attribute where attrelid = 'public.mafia_room_players'::regclass and attname = 'user_id' and not attisdropped), 'Realtime player rows contain no auth id column');
select ok(not has_function_privilege('anon', 'public.mafia_command(uuid,text,jsonb)', 'EXECUTE'), 'anon cannot invoke the state machine');
select ok(not has_function_privilege('authenticated', 'public.mafia_command(uuid,text,jsonb)', 'EXECUTE'), 'players must use the authenticated Edge Function');
select ok(has_function_privilege('service_role', 'public.mafia_command(uuid,text,jsonb)', 'EXECUTE'), 'only the server role can invoke the state machine');
select ok(not has_function_privilege('anon', 'public.mafia_snapshot(uuid,uuid)', 'EXECUTE'), 'anon cannot request a private player projection');
select ok(not has_function_privilege('authenticated', 'public.mafia_snapshot(uuid,uuid)', 'EXECUTE'), 'players cannot request another user private projection');

select * from finish();
rollback;

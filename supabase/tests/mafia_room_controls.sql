begin;
select plan(32);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
select ('20000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated',
  'mafia-controls-' || n || '@example.invalid', '', now(), '{}', '{}', now(), now(), true
from generate_series(1, 6) n
on conflict (id) do nothing;
select set_config('request.jwt.claim.role', 'service_role', true);

do $test$
#variable_conflict use_variable
declare
  u uuid[] := array[
    '20000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid,
    '20000000-0000-4000-8000-000000000003'::uuid,
    '20000000-0000-4000-8000-000000000004'::uuid,
    '20000000-0000-4000-8000-000000000005'::uuid,
    '20000000-0000-4000-8000-000000000006'::uuid
  ];
  room_id uuid;
  other_room_id uuid;
  ids uuid[];
  other_player uuid;
  state jsonb;
  role_set jsonb;
  deadline_before timestamptz;
  i integer;
begin
  state := public.mafia_command(u[1], 'create', '{"roomCode":"CTRL55","roomName":"Control Room","playerName":"Host"}');
  room_id := (state #>> '{room,id}')::uuid;
  ids := array[(state->>'myPlayerId')::uuid];
  perform ok(state #>> '{room,phase}' = 'lobby', 'creates a lobby for removal checks');
  state := public.mafia_command(u[2], 'join', '{"roomCode":"CTRL55","playerName":"Player Two"}');
  ids := array_append(ids, (state->>'myPlayerId')::uuid);
  state := public.mafia_command(u[3], 'join', '{"roomCode":"CTRL55","playerName":"Player Three"}');
  ids := array_append(ids, (state->>'myPlayerId')::uuid);
  perform ok(array_length(ids, 1) = 3, 'players join the lobby');

  perform throws_ok(
    format('select public.mafia_remove_player(%L::uuid,%L::uuid,%L::uuid)', u[2], room_id, ids[1]),
    '42501', 'Only the room host can remove players.', 'rejects a non-host removal'
  );
  perform throws_ok(
    format('select public.mafia_remove_player(%L::uuid,%L::uuid,%L::uuid)', u[1], room_id, ids[1]),
    'P0001', 'The host cannot remove themselves.', 'rejects removing the host'
  );

  state := public.mafia_command(u[4], 'create', '{"roomCode":"PTHR55","roomName":"Other Room","playerName":"Other Host"}');
  other_room_id := (state #>> '{room,id}')::uuid;
  other_player := (state->>'myPlayerId')::uuid;
  perform throws_ok(
    format('select public.mafia_remove_player(%L::uuid,%L::uuid,%L::uuid)', u[1], room_id, other_player),
    'P0001', 'Choose a player in this room to remove.', 'rejects targeting a player from another room'
  );

  state := public.mafia_remove_player(u[1], room_id, ids[2]);
  perform ok(jsonb_array_length(state->'players') = 2, 'host removal immediately updates the roster');
  perform ok(exists(select 1 from public.mafia_room_bans b where b.room_id = room_id and b.user_id = u[2]), 'removal records a room-scoped ban');
  perform ok(not exists(select 1 from public.mafia_room_players where id = ids[2]), 'removed player row and membership are deleted');
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''join'',%L::jsonb)', u[2], jsonb_build_object('roomCode','CTRL55','playerName','Player Two')::text),
    'P0001', 'The host removed you from this room.', 'rejects rejoining from the same session'
  );
  state := public.mafia_command(u[2], 'create', '{"roomCode":"NEW555","roomName":"Another Room","playerName":"Player Two"}');
  perform ok(state #>> '{room,code}' = 'NEW555', 'room-scoped removal does not block other rooms');

  update public.mafia_rooms set phase = 'night', status = 'active' where id = room_id;
  perform throws_ok(
    format('select public.mafia_remove_player(%L::uuid,%L::uuid,%L::uuid)', u[1], room_id, ids[3]),
    'P0001', 'Players can only be removed before the game starts.', 'rejects removal after the game starts'
  );

  state := public.mafia_command(u[1], 'create', '{"roomCode":"TMR555","roomName":"Timed Room","playerName":"Host"}');
  room_id := (state #>> '{room,id}')::uuid;
  ids := array[(state->>'myPlayerId')::uuid];
  for i in 2..5 loop
    state := public.mafia_command(u[i], 'join', jsonb_build_object('roomCode','TMR555','playerName','Timed '||i));
    ids := array_append(ids, (state->>'myPlayerId')::uuid);
    perform public.mafia_command(u[i], 'ready', jsonb_build_object('roomId',room_id,'ready',true));
  end loop;
  role_set := jsonb_build_array(
    jsonb_build_object('playerId',ids[1],'role','Mafia'),
    jsonb_build_object('playerId',ids[2],'role','Doctor'),
    jsonb_build_object('playerId',ids[3],'role','Detective'),
    jsonb_build_object('playerId',ids[4],'role','Villager'),
    jsonb_build_object('playerId',ids[5],'role','Villager'));
  perform public.mafia_command(u[1], 'start', jsonb_build_object('roomId',room_id,'roles',role_set));
  perform public.mafia_command(u[1], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','night','expectedRoundNumber',1));
  perform public.mafia_command(u[2], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[2],'expectedPhase','night','expectedRoundNumber',1));
  state := public.mafia_command(u[3], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','night','expectedRoundNumber',1));
  perform ok(state #>> '{room,phase}' = 'day', 'night resolution enters voting');
  select vote_deadline into deadline_before from public.mafia_rooms where id = room_id;
  perform ok(deadline_before > clock_timestamp() and deadline_before <= clock_timestamp() + interval '15 seconds', 'day phase gets a persisted 15-second deadline');
  perform public.mafia_command(u[1], 'state', jsonb_build_object('roomId',room_id));
  perform ok((select vote_deadline from public.mafia_rooms where id = room_id) = deadline_before, 'a state refresh does not restart voting time');
  perform ok(not public.mafia_resolve_vote_timeout(room_id), 'deadline check does not resolve voting early');

  perform public.mafia_command(u[1], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','day','expectedRoundNumber',1));
  update public.mafia_rooms set vote_deadline = clock_timestamp() - interval '1 second' where id = room_id;
  select vote_deadline into deadline_before from public.mafia_rooms where id = room_id;
  perform ok(public.mafia_resolve_vote_timeout(room_id), 'timeout resolves a partial vote set');
  perform ok(not public.mafia_resolve_vote_timeout(room_id), 'concurrent or repeated timeout resolution is idempotent');
  perform ok((select round_number = 2 and phase = 'night' from public.mafia_rooms where id = room_id), 'partial vote resolution advances exactly one round');
  perform ok(not (select is_alive from public.mafia_room_players where id = ids[4]), 'unique partial-vote leader is eliminated');
  perform ok((select vote_deadline is null from public.mafia_rooms where id = room_id), 'resolved voting clears the old deadline');

  perform public.mafia_command(u[1], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','night','expectedRoundNumber',2));
  perform public.mafia_command(u[2], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[2],'expectedPhase','night','expectedRoundNumber',2));
  state := public.mafia_command(u[3], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','night','expectedRoundNumber',2));
  perform ok(state #>> '{room,phase}' = 'day' and (select vote_deadline > deadline_before from public.mafia_rooms where id = room_id), 'the next voting round receives a fresh deadline');

  update public.mafia_rooms set vote_deadline = clock_timestamp() - interval '1 second' where id = room_id;
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''vote'',%L::jsonb)', u[2], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','day','expectedRoundNumber',2)::text),
    'P0001', 'Voting time is up. Your vote was not counted.', 'database rejects a late vote'
  );

  update public.mafia_rooms set phase = 'day', status = 'active', round_number = 3 where id = room_id;
  update public.mafia_rooms set vote_deadline = clock_timestamp() - interval '1 second' where id = room_id;
  perform ok(public.mafia_resolve_vote_timeout(room_id), 'timeout resolves a round with no votes');
  perform ok((select public_result = 'Time ran out with no votes. Nobody was eliminated.' from public.mafia_rooms where id = room_id), 'no-vote timeout has a clear public result');

  update public.mafia_rooms set phase = 'day', status = 'active', round_number = 4 where id = room_id;
  insert into public.mafia_day_votes(room_id, round_number, voter_player_id, target_player_id)
  values (room_id, 4, ids[1], ids[2]), (room_id, 4, ids[2], ids[5]);
  update public.mafia_rooms set vote_deadline = clock_timestamp() - interval '1 second' where id = room_id;
  perform ok(public.mafia_resolve_vote_timeout(room_id), 'timeout resolves a partial tied vote');
  perform ok((select public_result = 'The vote is tied. Nobody was eliminated.' from public.mafia_rooms where id = room_id), 'partial tie eliminates nobody');
  perform ok((select is_alive from public.mafia_room_players where id = ids[2]), 'player is not eliminated by a timeout tie');

  update public.mafia_room_players p set is_alive = p.id in (ids[1], ids[5]) where p.room_id = room_id;
  update public.mafia_rooms set phase = 'day', status = 'active', round_number = 5 where id = room_id;
  insert into public.mafia_day_votes(room_id, round_number, voter_player_id, target_player_id)
  values (room_id, 5, ids[5], ids[1]);
  update public.mafia_rooms set vote_deadline = clock_timestamp() - interval '1 second' where id = room_id;
  perform ok(public.mafia_resolve_vote_timeout(room_id), 'timeout resolves a final vote');
  perform ok((select winner = 'Town' and phase = 'ended' from public.mafia_rooms where id = room_id), 'timeout elimination still evaluates Town win conditions');

  perform ok(not has_table_privilege('authenticated', 'public.mafia_room_bans', 'SELECT'), 'room ban table is not readable by browser clients');
  perform ok(not has_function_privilege('authenticated', 'public.mafia_remove_player(uuid,uuid,uuid)', 'EXECUTE'), 'browser clients cannot invoke removal RPC');
  perform ok(not has_function_privilege('authenticated', 'public.mafia_resolve_vote_timeout(uuid)', 'EXECUTE'), 'browser clients cannot invoke timeout resolver');
end;
$test$;

select * from finish();
rollback;

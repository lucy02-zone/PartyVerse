begin;
select plan(25);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
values
  ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','mafia-test-1@example.invalid','',now(),'{}','{}',now(),now(),true),
  ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','mafia-test-2@example.invalid','',now(),'{}','{}',now(),now(),true),
  ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','mafia-test-3@example.invalid','',now(),'{}','{}',now(),now(),true),
  ('10000000-0000-4000-8000-000000000004','authenticated','authenticated','mafia-test-4@example.invalid','',now(),'{}','{}',now(),now(),true),
  ('10000000-0000-4000-8000-000000000005','authenticated','authenticated','mafia-test-5@example.invalid','',now(),'{}','{}',now(),now(),true),
  ('10000000-0000-4000-8000-000000000006','authenticated','authenticated','mafia-test-6@example.invalid','',now(),'{}','{}',now(),now(),true),
  ('10000000-0000-4000-8000-000000000007','authenticated','authenticated','mafia-test-7@example.invalid','',now(),'{}','{}',now(),now(),true)
on conflict (id) do nothing;

select set_config('request.jwt.claim.role', 'service_role', true);

do $test$
#variable_conflict use_variable
declare
  u uuid[] := array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    '10000000-0000-4000-8000-000000000004'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid,
    '10000000-0000-4000-8000-000000000006'::uuid
  ];
  ids uuid[];
  room_id uuid;
  state jsonb;
  role_set jsonb;
  i integer;
begin
  perform throws_ok(
    $$select public.mafia_command('10000000-0000-4000-8000-000000000001','create','{"roomCode":"BAD!","roomName":"Game Night","playerName":"Host"}')$$,
    'P0001', 'Invalid room code.', 'rejects malformed room codes'
  );
  perform throws_ok(
    $$select public.mafia_command('10000000-0000-4000-8000-000000000001','join','{"roomCode":"NOPE22","playerName":"Host"}')$$,
    'P0001', 'Room not found. Check the code and try again.', 'rejects unknown room codes'
  );

  state := public.mafia_command(u[1], 'create', '{"roomCode":"Q7JKLM","roomName":"Friday Game Night","playerName":"Host"}');
  room_id := (state #>> '{room,id}')::uuid;
  ids := array[(state->>'myPlayerId')::uuid];
  perform ok((state #>> '{room,phase}') = 'lobby' and state->>'isHost' = 'true' and state #>> '{room,name}' = 'Friday Game Night', 'creates a named host lobby');
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''join'',%L::jsonb)', u[2], jsonb_build_object('roomCode','Q7JKLM','playerName','Host')::text),
    'P0001', 'That name is already in this room.', 'rejects duplicate room names'
  );
  for i in 2..6 loop
    state := public.mafia_command(u[i], 'join', jsonb_build_object('roomCode','Q7JKLM','playerName','Player '||i));
    ids := array_append(ids, (state->>'myPlayerId')::uuid);
  end loop;
  for i in 2..6 loop
    perform public.mafia_command(u[i], 'ready', jsonb_build_object('roomId',room_id,'ready',true));
  end loop;
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''start'',%L::jsonb)', u[1], jsonb_build_object('roomId',room_id,'roles',jsonb_build_array(
      jsonb_build_object('playerId',ids[1],'role','Mafia'), jsonb_build_object('playerId',ids[2],'role','Doctor'),
      jsonb_build_object('playerId',ids[3],'role','Detective'), jsonb_build_object('playerId',ids[4],'role','Villager'),
      jsonb_build_object('playerId',ids[5],'role','Villager'), jsonb_build_object('playerId',ids[6],'role','Villager'),
      jsonb_build_object('playerId',ids[6],'role','Villager')))::text),
    'P0001', 'Role assignment is invalid.', 'rejects a role array with the wrong player count'
  );
  role_set := jsonb_build_array(
    jsonb_build_object('playerId',ids[1],'role','Mafia'), jsonb_build_object('playerId',ids[2],'role','Doctor'),
    jsonb_build_object('playerId',ids[3],'role','Detective'), jsonb_build_object('playerId',ids[4],'role','Villager'),
    jsonb_build_object('playerId',ids[5],'role','Villager'), jsonb_build_object('playerId',ids[6],'role','Villager'));
  state := public.mafia_command(u[1], 'start', jsonb_build_object('roomId',room_id,'roles',role_set));
  perform ok(state->>'yourRole' = 'Mafia' and state->>'isHost' = 'true', 'returns only the requesting host role');
  perform ok(not ((state->'players'->0) ? 'role'), 'public roster projection omits private roles');
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''state'',%L::jsonb)', '10000000-0000-4000-8000-000000000007', jsonb_build_object('roomId',room_id)::text),
    '42501', 'Room membership required.', 'rejects an outsider requesting room state'
  );
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''night_action'',%L::jsonb)', u[6], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','night','expectedRoundNumber',1)::text),
    'P0001', 'Your role has no night action.', 'rejects a Villager night action'
  );
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''night_action'',%L::jsonb)', u[1], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','night','expectedRoundNumber',9)::text),
    'P0001', 'Game state changed. Refresh the room and try again.', 'rejects stale round submissions'
  );
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''night_action'',%L::jsonb)', u[3], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[3],'expectedPhase','night','expectedRoundNumber',1)::text),
    'P0001', 'You cannot investigate yourself.', 'rejects a self-investigation'
  );
  perform public.mafia_command(u[1], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','night','expectedRoundNumber',1));
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''night_action'',%L::jsonb)', u[1], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','night','expectedRoundNumber',1)::text),
    'P0001', 'Your night action has already been submitted.', 'rejects duplicate night actions'
  );
  perform public.mafia_command(u[2], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','night','expectedRoundNumber',1));
  state := public.mafia_command(u[3], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','night','expectedRoundNumber',1));
  perform ok((select is_alive from public.mafia_room_players where id = ids[4]), 'Doctor protection prevents the night elimination');
  perform ok(state #>> '{investigation,isMafia}' = 'false', 'Detective receives the private investigation result');
  state := public.mafia_command(u[1], 'state', jsonb_build_object('roomId',room_id));
  perform ok(state->'investigation' = 'null'::jsonb, 'investigation result is absent from other players’ projections');

  perform public.mafia_command(u[1], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','day','expectedRoundNumber',1));
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''vote'',%L::jsonb)', u[1], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','day','expectedRoundNumber',1)::text),
    'P0001', 'Your vote has already been submitted.', 'rejects duplicate day votes'
  );
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''vote'',%L::jsonb)', u[2], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[2],'expectedPhase','day','expectedRoundNumber',1)::text),
    'P0001', 'You cannot vote for yourself.', 'rejects self-voting'
  );
  perform public.mafia_command(u[2], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','day','expectedRoundNumber',1));
  perform public.mafia_command(u[3], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','day','expectedRoundNumber',1));
  perform public.mafia_command(u[4], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','day','expectedRoundNumber',1));
  perform public.mafia_command(u[5], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','day','expectedRoundNumber',1));
  state := public.mafia_command(u[6], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','day','expectedRoundNumber',1));
  perform ok(state #>> '{room,phase}' = 'night' and state #>> '{room,roundNumber}' = '2', 'a tied vote advances without eliminating a player');

  perform public.mafia_command(u[1], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[4],'expectedPhase','night','expectedRoundNumber',2));
  perform public.mafia_command(u[2], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[5],'expectedPhase','night','expectedRoundNumber',2));
  state := public.mafia_command(u[3], 'night_action', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','night','expectedRoundNumber',2));
  perform ok(not (select is_alive from public.mafia_room_players where id = ids[4]), 'night resolution eliminates the unique Mafia target');
  perform ok(state #>> '{investigation,isMafia}' = 'true', 'Detective investigation correctly identifies Mafia');
  perform throws_ok(
    format('select public.mafia_command(%L::uuid,''vote'',%L::jsonb)', u[4], jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','day','expectedRoundNumber',2)::text),
    'P0001', 'Eliminated players cannot vote.', 'rejects votes from eliminated players'
  );

  perform public.mafia_command(u[1], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[2],'expectedPhase','day','expectedRoundNumber',2));
  perform public.mafia_command(u[2], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','day','expectedRoundNumber',2));
  perform public.mafia_command(u[3], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','day','expectedRoundNumber',2));
  perform public.mafia_command(u[5], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','day','expectedRoundNumber',2));
  state := public.mafia_command(u[6], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','day','expectedRoundNumber',2));
  perform ok(state #>> '{room,winner}' = 'Town' and state #>> '{room,phase}' = 'ended', 'Town wins after the Mafia is eliminated');
  perform ok(jsonb_array_length(state->'finalRoles') = 6, 'final roles are revealed to members after the game ends');
  state := public.mafia_command(u[2], 'join', jsonb_build_object('roomCode','Q7JKLM','playerName','Player 2'));
  perform ok(state->>'myPlayerId' = ids[2]::text and state #>> '{room,phase}' = 'ended', 'existing members can reconnect to ended rooms');

  state := public.mafia_command(u[1], 'create', '{"roomCode":"R8MNKL","roomName":"Playtest Night","playerName":"Host"}');
  room_id := (state #>> '{room,id}')::uuid;
  ids := array[(state->>'myPlayerId')::uuid];
  for i in 2..5 loop
    state := public.mafia_command(u[i], 'join', jsonb_build_object('roomCode','R8MNKL','playerName','Player '||i));
    ids := array_append(ids, (state->>'myPlayerId')::uuid);
    perform public.mafia_command(u[i], 'ready', jsonb_build_object('roomId',room_id,'ready',true));
  end loop;
  role_set := jsonb_build_array(
    jsonb_build_object('playerId',ids[1],'role','Mafia'), jsonb_build_object('playerId',ids[2],'role','Doctor'),
    jsonb_build_object('playerId',ids[3],'role','Detective'), jsonb_build_object('playerId',ids[4],'role','Villager'),
    jsonb_build_object('playerId',ids[5],'role','Villager'));
  perform public.mafia_command(u[1], 'start', jsonb_build_object('roomId',room_id,'roles',role_set));
  update public.mafia_room_players p set is_alive = p.id in (ids[1],ids[2]) where p.room_id = room_id;
  update public.mafia_rooms set phase = 'day', status = 'active', round_number = 1 where id = room_id;
  perform public.mafia_command(u[1], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[2],'expectedPhase','day','expectedRoundNumber',1));
  state := public.mafia_command(u[2], 'vote', jsonb_build_object('roomId',room_id,'targetPlayerId',ids[1],'expectedPhase','day','expectedRoundNumber',1));
  perform ok(state #>> '{room,winner}' = 'Mafia' and state #>> '{room,phase}' = 'ended', 'Mafia wins when it reaches parity with the town');
end;
$test$;

select * from finish();
rollback;

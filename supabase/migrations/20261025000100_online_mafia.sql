create extension if not exists pgcrypto with schema extensions;

create table public.mafia_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  room_name text not null check (length(room_name) between 2 and 40),
  status text not null default 'lobby' check (status in ('lobby', 'active', 'ended')),
  phase text not null default 'lobby' check (phase in ('lobby', 'night', 'day', 'ended')),
  round_number integer not null default 0 check (round_number >= 0),
  winner text check (winner in ('Town', 'Mafia')),
  public_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'ended') = (phase = 'ended'))
);

create table public.mafia_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mafia_rooms(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 30),
  is_ready boolean not null default false,
  is_alive boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, id)
);

create table public.mafia_room_memberships (
  room_id uuid not null,
  player_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  is_host boolean not null default false,
  primary key (room_id, user_id),
  unique (room_id, player_id),
  foreign key (room_id, player_id)
    references public.mafia_room_players(room_id, id) on delete cascade
);

create unique index mafia_room_player_names_unique
  on public.mafia_room_players (room_id, lower(display_name));
create index mafia_room_players_room_idx on public.mafia_room_players(room_id);

-- Secret tables are readable and writable only by the Edge Function's service role.
create table public.mafia_private_roles (
  room_id uuid not null,
  player_id uuid not null,
  role text not null check (role in ('Mafia', 'Doctor', 'Detective', 'Villager')),
  investigation_target_id uuid,
  investigation_is_mafia boolean,
  primary key (room_id, player_id),
  foreign key (room_id, player_id)
    references public.mafia_room_players(room_id, id) on delete cascade,
  foreign key (investigation_target_id)
    references public.mafia_room_players(id) on delete set null
);

create table public.mafia_night_actions (
  room_id uuid not null,
  round_number integer not null check (round_number > 0),
  actor_player_id uuid not null,
  action text not null check (action in ('kill', 'protect', 'investigate')),
  target_player_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (room_id, round_number, actor_player_id),
  foreign key (room_id, actor_player_id)
    references public.mafia_room_players(room_id, id) on delete cascade,
  foreign key (room_id, target_player_id)
    references public.mafia_room_players(room_id, id) on delete cascade
);

create table public.mafia_day_votes (
  room_id uuid not null,
  round_number integer not null check (round_number > 0),
  voter_player_id uuid not null,
  target_player_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (room_id, round_number, voter_player_id),
  foreign key (room_id, voter_player_id)
    references public.mafia_room_players(room_id, id) on delete cascade,
  foreign key (room_id, target_player_id)
    references public.mafia_room_players(room_id, id) on delete cascade
);

alter table public.mafia_rooms enable row level security;
alter table public.mafia_room_players enable row level security;
alter table public.mafia_room_memberships enable row level security;
alter table public.mafia_private_roles enable row level security;
alter table public.mafia_night_actions enable row level security;
alter table public.mafia_day_votes enable row level security;

revoke all on public.mafia_rooms, public.mafia_room_players,
  public.mafia_room_memberships, public.mafia_private_roles,
  public.mafia_night_actions, public.mafia_day_votes
  from anon, authenticated;
grant select on public.mafia_rooms, public.mafia_room_players to authenticated;

create or replace function public.mafia_is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.mafia_room_memberships m
    where m.room_id = p_room_id and m.user_id = (select auth.uid())
  );
$$;
revoke all on function public.mafia_is_room_member(uuid) from public, anon;
grant execute on function public.mafia_is_room_member(uuid) to authenticated;

create policy mafia_rooms_member_read on public.mafia_rooms
  for select to authenticated using (public.mafia_is_room_member(id));
create policy mafia_room_players_member_read on public.mafia_room_players
  for select to authenticated using (public.mafia_is_room_member(room_id));

create or replace function public.mafia_snapshot(p_room_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_room public.mafia_rooms%rowtype;
  v_player public.mafia_room_players%rowtype;
  v_role public.mafia_private_roles%rowtype;
  v_result jsonb;
  v_required integer := 0;
  v_submitted integer := 0;
  v_has_submitted boolean := false;
begin
  select * into v_room from public.mafia_rooms where id = p_room_id;
  select p.* into v_player from public.mafia_room_players p
    join public.mafia_room_memberships m on m.room_id = p.room_id and m.player_id = p.id
    where p.room_id = p_room_id and m.user_id = p_user_id;
  if v_room.id is null or v_player.id is null then
    raise exception using errcode = '42501', message = 'Room membership required.';
  end if;

  select * into v_role from public.mafia_private_roles
    where room_id = p_room_id and player_id = v_player.id;

  if v_room.phase = 'night' then
    select count(*) into v_required
      from public.mafia_room_players p
      join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
      where p.room_id = p_room_id and p.is_alive
        and (r.role = 'Mafia' or r.role in ('Doctor', 'Detective'));
    select count(*) into v_submitted from public.mafia_night_actions a
      where a.room_id = p_room_id and a.round_number = v_room.round_number;
  elsif v_room.phase = 'day' then
    select count(*) into v_required from public.mafia_room_players p
      where p.room_id = p_room_id and p.is_alive;
    select count(*) into v_submitted from public.mafia_day_votes a
      where a.room_id = p_room_id and a.round_number = v_room.round_number;
  end if;
  if v_room.phase = 'night' then
    select exists (select 1 from public.mafia_night_actions a
      where a.room_id = p_room_id and a.round_number = v_room.round_number and a.actor_player_id = v_player.id)
      into v_has_submitted;
  elsif v_room.phase = 'day' then
    select exists (select 1 from public.mafia_day_votes a
      where a.room_id = p_room_id and a.round_number = v_room.round_number and a.voter_player_id = v_player.id)
      into v_has_submitted;
  end if;

  select jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id, 'code', v_room.code, 'name', v_room.room_name, 'status', v_room.status,
      'phase', v_room.phase, 'roundNumber', v_room.round_number,
      'winner', v_room.winner, 'publicResult', v_room.public_result
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.display_name, 'ready', p.is_ready, 'alive', p.is_alive
      ) order by p.joined_at)
      from public.mafia_room_players p where p.room_id = p_room_id
    ), '[]'::jsonb),
    'myPlayerId', v_player.id,
    'isHost', (select m.is_host from public.mafia_room_memberships m where m.room_id = p_room_id and m.user_id = p_user_id),
    'hostPlayerId', (select m.player_id from public.mafia_room_memberships m where m.room_id = p_room_id and m.is_host),
    'yourRole', v_role.role,
    'mafiaTeammates', case when v_role.role = 'Mafia' then coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name))
      from public.mafia_room_players p
      join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
      where p.room_id = p_room_id and r.role = 'Mafia' and p.id <> v_player.id and p.is_alive
    ), '[]'::jsonb) else '[]'::jsonb end,
    'investigation', case when v_role.role = 'Detective'
      and v_role.investigation_target_id is not null then (
        select jsonb_build_object('playerName', p.display_name, 'isMafia', v_role.investigation_is_mafia)
        from public.mafia_room_players p
        where p.room_id = p_room_id and p.id = v_role.investigation_target_id
      ) else null end,
    'finalRoles', case when v_room.phase = 'ended' then coalesce((
      select jsonb_agg(jsonb_build_object('playerId', p.id, 'name', p.display_name, 'role', r.role, 'alive', p.is_alive) order by p.joined_at)
      from public.mafia_room_players p
      join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
      where p.room_id = p_room_id
    ), '[]'::jsonb) else null end,
    'submittedCount', v_submitted,
    'requiredCount', v_required,
    'hasSubmitted', v_has_submitted
  ) into v_result;
  return v_result;
end;
$$;

-- This projection accepts a user id and contains private information. It is
-- called only from the service-authorized command function below.
revoke all on function public.mafia_snapshot(uuid, uuid) from public, anon, authenticated;

create or replace function public.mafia_command(
  p_actor_user_id uuid,
  p_command text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.mafia_rooms%rowtype;
  v_actor public.mafia_room_players%rowtype;
  v_role public.mafia_private_roles%rowtype;
  v_target public.mafia_room_players%rowtype;
  v_room_id uuid;
  v_player_id uuid;
  v_code text;
  v_name text;
  v_room_name text;
  v_roles jsonb;
  v_count integer;
  v_required integer;
  v_submitted integer;
  v_action text;
  v_kill_target uuid;
  v_protect_target uuid;
  v_investigator uuid;
  v_top uuid[];
  v_top_count integer;
  v_eliminated_id uuid;
  v_eliminated_role text;
  v_mafia_count integer;
  v_town_count integer;
  v_winner text;
  v_result text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required.';
  end if;

  if p_command = 'create' then
    v_code := upper(coalesce(p_payload->>'roomCode', ''));
    v_name := btrim(coalesce(p_payload->>'playerName', ''));
    v_room_name := btrim(coalesce(p_payload->>'roomName', ''));
    if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'Invalid room code.'; end if;
    if length(v_room_name) not between 2 and 40 then raise exception 'Enter a room name from 2 to 40 characters.'; end if;
    if length(v_name) not between 1 and 30 then raise exception 'Enter a name from 1 to 30 characters.'; end if;
    insert into public.mafia_rooms(code, room_name) values (v_code, v_room_name) returning id into v_room_id;
    insert into public.mafia_room_players(room_id, display_name, is_ready)
      values (v_room_id, v_name, true) returning id into v_player_id;
    insert into public.mafia_room_memberships(room_id, player_id, user_id)
      values (v_room_id, v_player_id, p_actor_user_id) on conflict (room_id, user_id) do nothing;
    update public.mafia_room_memberships set is_host = true
      where room_id = v_room_id and player_id = v_player_id;
    return public.mafia_snapshot(v_room_id, p_actor_user_id);
  end if;

  v_room_id := nullif(p_payload->>'roomId', '')::uuid;
  v_code := upper(coalesce(p_payload->>'roomCode', ''));
  if v_room_id is null and v_code <> '' then
    select id into v_room_id from public.mafia_rooms where code = v_code;
  end if;
  if v_room_id is null then raise exception 'Room not found. Check the code and try again.'; end if;

  select * into v_room from public.mafia_rooms where id = v_room_id for update;
  if v_room.id is null then raise exception 'Room not found. Check the code and try again.'; end if;

  if p_command = 'join' then
    v_name := btrim(coalesce(p_payload->>'playerName', ''));
    if length(v_name) not between 1 and 30 then raise exception 'Enter a name from 1 to 30 characters.'; end if;
    select p.* into v_actor from public.mafia_room_players p
      join public.mafia_room_memberships m on m.room_id = p.room_id and m.player_id = p.id
      where p.room_id = v_room_id and m.user_id = p_actor_user_id;
    if v_actor.id is null then
      if v_room.phase <> 'lobby' then raise exception 'This game has already started or ended.'; end if;
      select count(*) into v_count from public.mafia_room_players where room_id = v_room_id;
      if v_count >= 15 then raise exception 'This room is full.'; end if;
      if exists (select 1 from public.mafia_room_players where room_id = v_room_id and lower(display_name) = lower(v_name)) then
        raise exception 'That name is already in this room.';
      end if;
      insert into public.mafia_room_players(room_id, display_name)
        values (v_room_id, v_name) returning id into v_player_id;
      insert into public.mafia_room_memberships(room_id, player_id, user_id)
        values (v_room_id, v_player_id, p_actor_user_id);
    end if;
  elsif p_command <> 'state' then
    select p.* into v_actor from public.mafia_room_players p
      join public.mafia_room_memberships m on m.room_id = p.room_id and m.player_id = p.id
      where p.room_id = v_room_id and m.user_id = p_actor_user_id;
    if v_actor.id is null then raise exception using errcode = '42501', message = 'Room membership required.'; end if;

    if p_command in ('night_action', 'vote') and (
      coalesce(p_payload->>'expectedPhase', '') <> v_room.phase
      or coalesce(p_payload->>'expectedRoundNumber', '') <> v_room.round_number::text
    ) then
      raise exception 'Game state changed. Refresh the room and try again.';
    end if;

    if p_command = 'ready' then
      if v_room.phase <> 'lobby' then raise exception 'Lobby is closed.'; end if;
      update public.mafia_room_players set is_ready = (p_payload->>'ready')::boolean
        where id = v_actor.id;
    elsif p_command = 'start' then
      if not exists (select 1 from public.mafia_room_memberships m where m.room_id = v_room_id and m.user_id = p_actor_user_id and m.is_host) then
        raise exception using errcode = '42501', message = 'Only the host can start the game.';
      end if;
      if v_room.phase <> 'lobby' then raise exception 'The game has already started.'; end if;
      select count(*) into v_count from public.mafia_room_players where room_id = v_room_id;
      if v_count not between 5 and 15 then raise exception 'Mafia needs 5 to 15 players.'; end if;
      if exists (select 1 from public.mafia_room_players where room_id = v_room_id and not is_ready) then
        raise exception 'Wait for every player to be ready.';
      end if;
      v_roles := p_payload->'roles';
      if jsonb_typeof(v_roles) <> 'array' or jsonb_array_length(v_roles) <> v_count then raise exception 'Role assignment is invalid.'; end if;
      if exists (
        select 1 from public.mafia_room_players p
        left join (select x->>'playerId' as player_id, x->>'role' as role from jsonb_array_elements(v_roles) x) r
          on r.player_id = p.id::text
        where p.room_id = v_room_id and (r.player_id is null or r.role not in ('Mafia','Doctor','Detective','Villager'))
      ) or exists (
        select 1 from jsonb_array_elements(v_roles) x
        left join public.mafia_room_players p on p.room_id = v_room_id and p.id::text = x->>'playerId'
        where p.id is null
      ) then raise exception 'Role assignment does not match this room.'; end if;
      if (select count(*) from jsonb_array_elements(v_roles) x where x->>'role' = 'Mafia') <> case when v_count < 7 then 1 when v_count < 11 then 2 else 3 end
        or (select count(*) from jsonb_array_elements(v_roles) x where x->>'role' = 'Doctor') <> 1
        or (select count(*) from jsonb_array_elements(v_roles) x where x->>'role' = 'Detective') <> 1
        or (select count(*) from jsonb_array_elements(v_roles) x where x->>'role' = 'Villager') <> v_count - (case when v_count < 7 then 1 when v_count < 11 then 2 else 3 end) - 2
      then raise exception 'Role counts are invalid for this room.'; end if;
      insert into public.mafia_private_roles(room_id, player_id, role)
        select v_room_id, (x->>'playerId')::uuid, x->>'role' from jsonb_array_elements(v_roles) x;
      update public.mafia_rooms set status = 'active', phase = 'night', round_number = 1,
        public_result = 'The first night begins.', updated_at = now() where id = v_room_id;
    elsif p_command = 'night_action' then
      if v_room.phase <> 'night' or v_room.status <> 'active' then raise exception 'Night actions are closed.'; end if;
      if not v_actor.is_alive then raise exception 'Eliminated players cannot act.'; end if;
      select * into v_role from public.mafia_private_roles where room_id = v_room_id and player_id = v_actor.id;
      v_action := case v_role.role when 'Mafia' then 'kill' when 'Doctor' then 'protect' when 'Detective' then 'investigate' else null end;
      if v_action is null then raise exception 'Your role has no night action.'; end if;
      if exists (select 1 from public.mafia_night_actions where room_id = v_room_id and round_number = v_room.round_number and actor_player_id = v_actor.id) then
        raise exception 'Your night action has already been submitted.';
      end if;
      select * into v_target from public.mafia_room_players where room_id = v_room_id and id = (p_payload->>'targetPlayerId')::uuid and is_alive;
      if v_target.id is null then raise exception 'Choose a living player in this room.'; end if;
      if v_target.id = v_actor.id and v_action = 'investigate' then raise exception 'You cannot investigate yourself.'; end if;
      if v_action = 'kill' and exists (select 1 from public.mafia_private_roles where room_id = v_room_id and player_id = v_target.id and role = 'Mafia') then
        raise exception 'The Mafia cannot target a teammate.';
      end if;
      insert into public.mafia_night_actions(room_id, round_number, actor_player_id, action, target_player_id)
        values (v_room_id, v_room.round_number, v_actor.id, v_action, v_target.id);
      select count(*) into v_required from public.mafia_room_players p
        join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
        where p.room_id = v_room_id and p.is_alive and r.role in ('Mafia','Doctor','Detective');
      select count(*) into v_submitted from public.mafia_night_actions
        where room_id = v_room_id and round_number = v_room.round_number;
      if v_submitted = v_required then
        select target_player_id, count(*) into v_kill_target, v_top_count
          from public.mafia_night_actions where room_id = v_room_id and round_number = v_room.round_number and action = 'kill'
          group by target_player_id order by count(*) desc limit 1;
        select array_agg(target_player_id) into v_top from (
          select target_player_id from public.mafia_night_actions
          where room_id = v_room_id and round_number = v_room.round_number and action = 'kill'
          group by target_player_id having count(*) = coalesce(v_top_count,0)
        ) tied;
        select target_player_id into v_protect_target from public.mafia_night_actions
          where room_id = v_room_id and round_number = v_room.round_number and action = 'protect' limit 1;
        select actor_player_id into v_investigator from public.mafia_night_actions
          where room_id = v_room_id and round_number = v_room.round_number and action = 'investigate' limit 1;
        if v_investigator is not null then
          update public.mafia_private_roles r set
            investigation_target_id = a.target_player_id,
            investigation_is_mafia = exists(select 1 from public.mafia_private_roles target_role where target_role.room_id = v_room_id and target_role.player_id = a.target_player_id and target_role.role = 'Mafia')
          from public.mafia_night_actions a
          where r.room_id = v_room_id and r.player_id = v_investigator and a.room_id = v_room_id
            and a.round_number = v_room.round_number and a.actor_player_id = v_investigator;
        end if;
        if coalesce(array_length(v_top,1),0) = 1 and v_kill_target is distinct from v_protect_target then
          update public.mafia_room_players set is_alive = false where room_id = v_room_id and id = v_kill_target;
          select display_name into v_name from public.mafia_room_players where id = v_kill_target;
          v_result := v_name || ' was found eliminated this morning.';
        elsif coalesce(array_length(v_top,1),0) > 1 then
          v_result := 'The Mafia could not agree on a target. Everyone survived the night.';
        elsif v_kill_target is not null then
          v_result := 'The Doctor protected the Mafia target. Everyone survived the night.';
        else
          v_result := 'Everyone survived the night.';
        end if;
        select count(*) filter (where r.role = 'Mafia'), count(*) filter (where r.role <> 'Mafia')
          into v_mafia_count, v_town_count from public.mafia_room_players p
          join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
          where p.room_id = v_room_id and p.is_alive;
        v_winner := case when v_mafia_count = 0 then 'Town' when v_mafia_count >= v_town_count then 'Mafia' else null end;
        update public.mafia_rooms set
          phase = case when v_winner is null then 'day' else 'ended' end,
          status = case when v_winner is null then 'active' else 'ended' end,
          winner = v_winner, public_result = v_result, updated_at = now()
          where id = v_room_id;
      end if;
    elsif p_command = 'vote' then
      if v_room.phase <> 'day' or v_room.status <> 'active' then raise exception 'Day voting is closed.'; end if;
      if not v_actor.is_alive then raise exception 'Eliminated players cannot vote.'; end if;
      select * into v_target from public.mafia_room_players where room_id = v_room_id and id = (p_payload->>'targetPlayerId')::uuid and is_alive;
      if v_target.id is null then raise exception 'Choose a living player in this room.'; end if;
      if v_target.id = v_actor.id then raise exception 'You cannot vote for yourself.'; end if;
      if exists (select 1 from public.mafia_day_votes where room_id = v_room_id and round_number = v_room.round_number and voter_player_id = v_actor.id) then
        raise exception 'Your vote has already been submitted.';
      end if;
      insert into public.mafia_day_votes(room_id, round_number, voter_player_id, target_player_id)
        values (v_room_id, v_room.round_number, v_actor.id, v_target.id);
      select count(*) into v_required from public.mafia_room_players where room_id = v_room_id and is_alive;
      select count(*) into v_submitted from public.mafia_day_votes where room_id = v_room_id and round_number = v_room.round_number;
      if v_submitted = v_required then
        select max(vote_count) into v_top_count from (
          select count(*) as vote_count from public.mafia_day_votes
          where room_id = v_room_id and round_number = v_room.round_number group by target_player_id
        ) totals;
        select array_agg(target_player_id) into v_top from (
          select target_player_id from public.mafia_day_votes
          where room_id = v_room_id and round_number = v_room.round_number
          group by target_player_id having count(*) = v_top_count
        ) tied;
        if coalesce(array_length(v_top,1),0) = 1 then
          v_eliminated_id := v_top[1];
          update public.mafia_room_players set is_alive = false where room_id = v_room_id and id = v_eliminated_id;
          select p.display_name, r.role into v_name, v_eliminated_role
            from public.mafia_room_players p join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
            where p.id = v_eliminated_id;
          v_result := v_name || ' was eliminated. Their role was ' || v_eliminated_role || '.';
        else
          v_result := 'The vote is tied. Nobody was eliminated.';
        end if;
        select count(*) filter (where r.role = 'Mafia'), count(*) filter (where r.role <> 'Mafia')
          into v_mafia_count, v_town_count from public.mafia_room_players p
          join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
          where p.room_id = v_room_id and p.is_alive;
        v_winner := case when v_mafia_count = 0 then 'Town' when v_mafia_count >= v_town_count then 'Mafia' else null end;
        update public.mafia_rooms set
          phase = case when v_winner is null then 'night' else 'ended' end,
          status = case when v_winner is null then 'active' else 'ended' end,
          round_number = case when v_winner is null then round_number + 1 else round_number end,
          winner = v_winner, public_result = v_result, updated_at = now()
          where id = v_room_id;
      end if;
    else
      raise exception 'Unsupported Mafia command.';
    end if;
  end if;

  return public.mafia_snapshot(v_room_id, p_actor_user_id);
end;
$$;

revoke all on function public.mafia_snapshot(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mafia_command(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.mafia_command(uuid, text, jsonb) to service_role;

-- Safe room and player metadata may trigger Realtime events; secret tables are deliberately absent.
alter publication supabase_realtime add table public.mafia_rooms;
alter publication supabase_realtime add table public.mafia_room_players;

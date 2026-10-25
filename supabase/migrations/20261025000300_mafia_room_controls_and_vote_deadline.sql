-- Host-controlled lobby removal and server-authoritative, persisted voting deadlines.
-- This migration is forward-only and does not reset room data.

alter table public.mafia_rooms add column if not exists vote_deadline timestamptz;

create table if not exists public.mafia_room_bans (
  room_id uuid not null references public.mafia_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  removed_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.mafia_room_bans enable row level security;
revoke all on public.mafia_room_bans from anon, authenticated;
grant all on public.mafia_room_bans to service_role;

create or replace function public.mafia_reject_banned_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.mafia_room_bans b
    where b.room_id = new.room_id and b.user_id = new.user_id
  ) then
    raise exception 'The host removed you from this room.';
  end if;
  return new;
end;
$$;
revoke all on function public.mafia_reject_banned_membership() from public, anon, authenticated;
drop trigger if exists mafia_membership_reject_banned on public.mafia_room_memberships;
create trigger mafia_membership_reject_banned
before insert on public.mafia_room_memberships
for each row execute function public.mafia_reject_banned_membership();

create or replace function public.mafia_set_vote_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phase = 'day' then
    if tg_op = 'INSERT' then
      new.vote_deadline := coalesce(new.vote_deadline, clock_timestamp() + interval '15 seconds');
    elsif old.phase is distinct from 'day' then
      new.vote_deadline := coalesce(new.vote_deadline, clock_timestamp() + interval '15 seconds');
    end if;
  else
    new.vote_deadline := null;
  end if;
  return new;
end;
$$;
revoke all on function public.mafia_set_vote_deadline() from public, anon, authenticated;

drop trigger if exists mafia_rooms_vote_deadline on public.mafia_rooms;
create trigger mafia_rooms_vote_deadline
before insert or update on public.mafia_rooms
for each row execute function public.mafia_set_vote_deadline();

-- Give any day already in progress at migration time a bounded remaining window.
update public.mafia_rooms
set vote_deadline = clock_timestamp() + interval '15 seconds'
where phase = 'day' and vote_deadline is null;

create or replace function public.mafia_reject_late_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phase text;
  v_deadline timestamptz;
begin
  select phase, vote_deadline into v_phase, v_deadline
  from public.mafia_rooms where id = new.room_id for update;
  if v_phase = 'day' and (v_deadline is null or clock_timestamp() >= v_deadline) then
    raise exception 'Voting time is up. Your vote was not counted.';
  end if;
  return new;
end;
$$;
revoke all on function public.mafia_reject_late_vote() from public, anon, authenticated;

drop trigger if exists mafia_day_votes_reject_late on public.mafia_day_votes;
create trigger mafia_day_votes_reject_late
before insert on public.mafia_day_votes
for each row execute function public.mafia_reject_late_vote();

create or replace function public.mafia_resolve_vote_timeout(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.mafia_rooms%rowtype;
  v_top_count integer;
  v_top uuid[];
  v_eliminated_id uuid;
  v_name text;
  v_role text;
  v_mafia_count integer;
  v_town_count integer;
  v_winner text;
  v_result text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required.';
  end if;

  select * into v_room from public.mafia_rooms where id = p_room_id for update;
  if v_room.id is null or v_room.phase <> 'day' or v_room.vote_deadline is null
    or clock_timestamp() < v_room.vote_deadline then
    return false;
  end if;

  select max(vote_count) into v_top_count from (
    select count(*) as vote_count from public.mafia_day_votes
    where room_id = p_room_id and round_number = v_room.round_number
    group by target_player_id
  ) totals;

  if v_top_count is null then
    v_result := 'Time ran out with no votes. Nobody was eliminated.';
  else
    select array_agg(target_player_id) into v_top from (
      select target_player_id from public.mafia_day_votes
      where room_id = p_room_id and round_number = v_room.round_number
      group by target_player_id having count(*) = v_top_count
    ) tied;

    if coalesce(array_length(v_top, 1), 0) = 1 then
      v_eliminated_id := v_top[1];
      update public.mafia_room_players set is_alive = false
      where room_id = p_room_id and id = v_eliminated_id and is_alive;
      select p.display_name, r.role into v_name, v_role
      from public.mafia_room_players p
      join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
      where p.room_id = p_room_id and p.id = v_eliminated_id;
      v_result := v_name || ' was eliminated. Their role was ' || v_role || '.';
    else
      v_result := 'The vote is tied. Nobody was eliminated.';
    end if;
  end if;

  select count(*) filter (where r.role = 'Mafia'), count(*) filter (where r.role <> 'Mafia')
  into v_mafia_count, v_town_count
  from public.mafia_room_players p
  join public.mafia_private_roles r on r.room_id = p.room_id and r.player_id = p.id
  where p.room_id = p_room_id and p.is_alive;
  v_winner := case when v_mafia_count = 0 then 'Town'
    when v_mafia_count >= v_town_count then 'Mafia' else null end;

  update public.mafia_rooms set
    phase = case when v_winner is null then 'night' else 'ended' end,
    status = case when v_winner is null then 'active' else 'ended' end,
    round_number = case when v_winner is null then round_number + 1 else round_number end,
    winner = v_winner,
    public_result = v_result,
    vote_deadline = null,
    updated_at = clock_timestamp()
  where id = p_room_id;
  return true;
end;
$$;
revoke all on function public.mafia_resolve_vote_timeout(uuid) from public, anon, authenticated;
grant execute on function public.mafia_resolve_vote_timeout(uuid) to service_role;

create or replace function public.mafia_remove_player(
  p_actor_user_id uuid,
  p_room_id uuid,
  p_target_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.mafia_rooms%rowtype;
  v_is_host boolean;
  v_target_user_id uuid;
  v_target_is_host boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required.';
  end if;

  select * into v_room from public.mafia_rooms where id = p_room_id for update;
  if v_room.id is null then raise exception 'Room not found. Check the code and try again.'; end if;
  select is_host into v_is_host from public.mafia_room_memberships
  where room_id = p_room_id and user_id = p_actor_user_id;
  if coalesce(v_is_host, false) is not true then
    raise exception using errcode = '42501', message = 'Only the room host can remove players.';
  end if;
  if v_room.phase <> 'lobby' then raise exception 'Players can only be removed before the game starts.'; end if;

  select m.user_id, m.is_host into v_target_user_id, v_target_is_host
  from public.mafia_room_players p
  join public.mafia_room_memberships m on m.room_id = p.room_id and m.player_id = p.id
  where p.room_id = p_room_id and p.id = p_target_player_id;
  if v_target_user_id is null then raise exception 'Choose a player in this room to remove.'; end if;
  if v_target_user_id = p_actor_user_id or v_target_is_host then
    raise exception 'The host cannot remove themselves.';
  end if;

  insert into public.mafia_room_bans(room_id, user_id)
  values (p_room_id, v_target_user_id)
  on conflict (room_id, user_id) do nothing;
  delete from public.mafia_room_players where room_id = p_room_id and id = p_target_player_id;
  return public.mafia_snapshot(p_room_id, p_actor_user_id);
end;
$$;
revoke all on function public.mafia_remove_player(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mafia_remove_player(uuid, uuid, uuid) to service_role;

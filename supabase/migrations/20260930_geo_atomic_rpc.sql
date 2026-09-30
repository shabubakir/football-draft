-- ============================================================
-- GEOGUESSR LITE — атомарные RPC для устранения race condition
--
-- Проблема: раньше guess/next читали rounds_data, мутировали в JS,
-- и PATCH'или обратно. При одновременных запросах двух игроков
-- последний PATCH перезаписывал результат предыдущего — чужой
-- ответ терялся (симптом: "все нажали, но сервер видит 3/4").
--
-- Решение: все мутации rounds_data происходят внутри Postgres-функций
-- (SELECT ... FOR UPDATE блокирует строку на время транзакции),
-- и возвращают финальное состояние.
-- ============================================================

-- ---------- Атомарное добавление ГОТОВОГО entry (сервер уже посчитал очки) ----------
create or replace function public.geo_add_guess_entry(
  p_room_id uuid,
  p_player_id text,
  p_entry jsonb   -- {playerId, lat, lng, distanceKm, points}
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room        geo_rooms%rowtype;
  v_rounds      jsonb;
  v_idx         int;
  v_guesses     jsonb;
  v_new_guesses jsonb;
begin
  select * into v_room from geo_rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found';
  end if;
  if v_room.status <> 'playing' then
    raise exception 'game not playing';
  end if;

  v_rounds := v_room.rounds_data;

  v_idx := -1;
  for i in 0 .. jsonb_array_length(v_rounds) - 1 loop
    if v_rounds -> i ->> 'location_id' is not null then
      v_idx := i;
    end if;
  end loop;
  if v_idx < 0 then
    raise exception 'no active round';
  end if;

  v_guesses := v_rounds -> v_idx -> 'guesses';

  -- Идемпотентность: уже ответил — возвращаем как есть
  if exists (
    select 1 from jsonb_array_elements(v_guesses) as g
    where g ->> 'playerId' = p_player_id
  ) then
    return jsonb_build_object(
      'room', to_jsonb(v_room),
      'alreadyAnswered', true
    );
  end if;

  v_new_guesses := v_guesses || jsonb_build_array(p_entry);
  v_rounds := jsonb_set(v_rounds, '{' || v_idx || ',guesses}', v_new_guesses);
  v_rounds := jsonb_set(v_rounds, '{' || v_idx || ',last_activity}', to_jsonb(now()));

  update geo_rooms
  set rounds_data = v_rounds
  where id = p_room_id;

  select * into v_room from geo_rooms where id = p_room_id;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'alreadyAnswered', false
  );
end;
$$;

-- ---------- Атомарный auto-skip (0 очков) ----------
create or replace function public.geo_auto_skip(
  p_room_id uuid,
  p_player_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return geo_add_guess_entry(
    p_room_id,
    p_player_id,
    jsonb_build_object(
      'playerId', p_player_id,
      'lat', 0,
      'lng', 0,
      'distanceKm', 20000,
      'points', 0
    )
  );
end;
$$;

-- ---------- Атомарный переход к следующему раунду / финал ----------
create or replace function public.geo_next_round(
  p_room_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room        geo_rooms%rowtype;
  v_rounds      jsonb;
  v_idx         int;
  v_next        int;
  v_answered    text[];
  v_pending     text;
  v_status      text;
  v_winner      text;
  v_finished    timestamptz;
  v_round_anchor timestamptz;
  v_is_stuck    boolean;
  v_scores      jsonb;
  v_total       int;
  v_max         int;
  v_candidates  text[];
  i int;
  p_id text;
  p_online boolean;
begin
  select * into v_room from geo_rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found';
  end if;
  if v_room.status <> 'playing' then
    raise exception 'game not playing';
  end if;

  v_rounds := v_room.rounds_data;

  v_idx := -1;
  for i in 0 .. jsonb_array_length(v_rounds) - 1 loop
    if v_rounds -> i ->> 'location_id' is not null then
      v_idx := i;
    end if;
  end loop;
  if v_idx < 0 then
    raise exception 'no active round';
  end if;

  -- Кто ответил в активном раунде
  select coalesce(array_agg(g ->> 'playerId'), '{}') into v_answered
  from jsonb_array_elements(v_rounds -> v_idx -> 'guesses') as g;

  -- Кто онлайн и НЕ ответил
  v_pending := '';
  for p in select jsonb_array_elements(v_room.players) as pp
  loop
    p_id := p.pp ->> 'id';
    p_online := (p.pp ->> 'online') = 'true';
    if p_online and not (p_id = any(v_answered)) then
      v_pending := case when v_pending = '' then p.pp ->> 'name'
                         else v_pending || ', ' || (p.pp ->> 'name')
                    end;
    end if;
  end loop;

  if v_pending <> '' then
    v_round_anchor := (v_rounds -> v_idx ->> 'last_activity')::timestamptz;
    if v_round_anchor is null then
      v_round_anchor := v_room.started_at;
    end if;
    v_is_stuck := (
      jsonb_array_length(v_rounds -> v_idx -> 'guesses') > 0
      and v_round_anchor is not null
      and now() - v_round_anchor > interval '35 seconds'
    );
    if not v_is_stuck then
      raise exception 'Ждём ответов: %', v_pending;
    end if;
  end if;

  -- Следующий неактивированный раунд
  v_next := -1;
  for i in 0 .. jsonb_array_length(v_rounds) - 1 loop
    if v_rounds -> i ->> 'location_id' is null then
      v_next := i;
      exit;
    end if;
  end loop;

  v_status := v_room.status;
  v_winner := v_room.winner_id;
  v_finished := v_room.finished_at;

  if v_next < 0 then
    -- Финал: пересчёт очков по rounds_data
    v_status := 'finished';
    v_finished := now();
    v_scores := '[]'::jsonb;
    for p in select jsonb_array_elements(v_room.players) as pp
    loop
      p_id := p.pp ->> 'id';
      v_total := 0;
      for r in select jsonb_array_elements(v_rounds) as rr
      loop
        for g in select jsonb_array_elements(r.rr -> 'guesses') as gg
        loop
          if g.gg ->> 'playerId' = p_id then
            v_total := v_total + coalesce((g.gg ->> 'points')::int, 0);
          end if;
        end loop;
      end loop;
      v_scores := v_scores || jsonb_build_object('playerId', p_id, 'total', v_total);
    end loop;
    select max((s ->> 'total')::int) into v_max from jsonb_array_elements(v_scores) as s;
    v_winner := null;
    if v_max is not null and v_max > 0 then
      select coalesce(array_agg((s ->> 'playerId')), '{}') into v_candidates
        from jsonb_array_elements(v_scores) as s
        where (s ->> 'total')::int = v_max;
      if array_length(v_candidates, 1) = 1 then
        v_winner := v_candidates[1];
      end if;
    end if;
  else
    -- Активируем следующий раунд
    v_rounds := jsonb_set(
      v_rounds,
      '{' || v_next || ',location_id}',
      to_jsonb(v_room.round_location_ids -> v_next ->> 0)
    );
    v_rounds := jsonb_set(v_rounds, '{' || v_next || ',guesses}', '[]'::jsonb);
    v_rounds := jsonb_set(v_rounds, '{' || v_next || ',last_activity}', to_jsonb(now()));
  end if;

  update geo_rooms
  set rounds_data = v_rounds,
      status = v_status,
      winner_id = v_winner,
      finished_at = v_finished,
      scores = case when v_next < 0 then v_scores else v_room.scores end
  where id = p_room_id;

  select * into v_room from geo_rooms where id = p_room_id;

  return to_jsonb(v_room);
end;
$$;

-- ---------- GRANT ----------
grant execute on function public.geo_add_guess_entry(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.geo_next_round(uuid) to anon, authenticated;
grant execute on function public.geo_auto_skip(uuid, text) to anon, authenticated;

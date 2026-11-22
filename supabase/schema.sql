-- 校园美食地图 数据库结构
-- 在 Supabase 控制台 → SQL Editor 中运行本文件即可。本文件可以重复运行。
-- 不预置任何店家或优惠：所有数据都由用户提交。
--
-- 设计：
-- * 同学提交「提案」（新增店家 / 新增优惠 / 修改优惠 / 取消优惠），每票都要附照片证据。
-- * 新增店家、新增或修改优惠附照片提交即生效；取消优惠需要 2 个不同的人确认（且确认多于反对），
--   2 人反对则驳回；14 天没结果自动过期。门槛见 proposal_threshold。
-- * restaurants / deals / proposals / votes 的每一次变化都由触发器写进 ledger（账本）：
--   只能追加、不能修改，每条记录带上一条的哈希，任何人都能下载下来验证历史没被偷偷改过。
-- * 所有表都开启 RLS 且不设公开策略：浏览器无法直接读写，只能经过 Next.js 后端（secret key）。

-- ───────────── 表 ─────────────

create table if not exists public.restaurants (
  id           bigint generated always as identity primary key,
  name         text not null,
  category     text not null,
  address      text not null,
  price_range  text,
  walk_minutes int check (walk_minutes is null or walk_minutes >= 0),
  rating       numeric(2,1) check (rating is null or rating between 0 and 5),
  emoji        text not null default '🍽️',
  color        text not null default '#e7dfcf',
  accent       text not null default '#df7a44',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.deals (
  id               bigint generated always as identity primary key,
  restaurant_id    bigint not null references public.restaurants(id) on delete cascade,
  kind             text not null check (kind in ('discount', 'coupon')),
  title            text not null,
  source           text,
  starts_on        date,
  ends_on          date,
  last_verified_on date not null default current_date,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists deals_restaurant_id_idx on public.deals (restaurant_id);

-- 店家坐标（WGS84），用于地图和计算步行时间
alter table public.restaurants add column if not exists lat double precision check (lat is null or lat between -90 and 90);
alter table public.restaurants add column if not exists lng double precision check (lng is null or lng between -180 and 180);

-- 从校园中心（King's College Circle）步行大约要几分钟：直线距离 × 1.3（绕路）÷ 80 米/分钟
create or replace function public.walk_minutes_from_campus(p_lat double precision, p_lng double precision) returns int
language sql immutable as $$
  select case when p_lat is null or p_lng is null then null else greatest(1, round(
    6371000 * 2 * asin(sqrt(
      power(sin(radians(p_lat - 43.661753) / 2), 2) +
      cos(radians(43.661753)) * cos(radians(p_lat)) * power(sin(radians(p_lng - (-79.395178)) / 2), 2)
    )) * 1.3 / 80
  ))::int end
$$;

create table if not exists public.proposals (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('add_restaurant', 'add_deal', 'update_deal', 'remove_deal')),
  restaurant_id bigint references public.restaurants(id) on delete cascade,
  deal_id       bigint references public.deals(id) on delete cascade,
  payload       jsonb not null default '{}'::jsonb,
  claim         text not null,               -- 人类可读的主张，例如「某店的学生 9 折已经取消」
  created_by    uuid not null,               -- Supabase Auth 用户 id（匿名化展示）
  status        text not null default 'pending'
                check (status in ('pending', 'applied', 'rejected', 'expired', 'cancelled')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '14 days',
  resolved_at   timestamptz,
  constraint proposals_target_check check (
    (kind = 'add_restaurant' and restaurant_id is null and deal_id is null) or
    (kind = 'add_deal' and restaurant_id is not null and deal_id is null) or
    (kind in ('update_deal', 'remove_deal') and deal_id is not null)
  )
);
create index if not exists proposals_status_idx on public.proposals (status, created_at desc);
create index if not exists proposals_deal_idx on public.proposals (deal_id) where status = 'pending';

create table if not exists public.votes (
  id              bigint generated always as identity primary key,
  proposal_id     bigint not null references public.proposals(id) on delete cascade,
  user_id         uuid not null,
  stance          text not null check (stance in ('confirm', 'reject')),
  evidence_path   text not null,             -- Supabase Storage 中 evidence 桶里的路径
  evidence_sha256 text not null,
  ai_verdict      text not null,             -- supports / contradicts / unclear / unchecked
  ai_reason       text,
  created_at      timestamptz not null default now(),
  constraint votes_one_per_user unique (proposal_id, user_id),
  constraint votes_unique_evidence unique (proposal_id, evidence_sha256)
);
create index if not exists votes_user_idx on public.votes (user_id, created_at desc);

create table if not exists public.ledger (
  seq        bigint generated always as identity primary key,
  prev_hash  text not null,
  hash       text not null unique,
  body       text not null,                  -- 被哈希的原文（JSON 字符串），验证时原样使用
  created_at timestamptz not null default now()
);

-- ───────────── 账本 ─────────────

-- hash = sha256(prev_hash + "\n" + body)，第一条的 prev_hash 是 64 个 0。
create or replace function public.ledger_append(p_body jsonb) returns void
language plpgsql as $$
declare
  v_prev text;
  v_body text := p_body::text;
begin
  perform pg_advisory_xact_lock(hashtext('fluffy_waffle_ledger'));
  select hash into v_prev from public.ledger order by seq desc limit 1;
  v_prev := coalesce(v_prev, repeat('0', 64));
  insert into public.ledger (prev_hash, hash, body)
  values (v_prev, encode(sha256(convert_to(v_prev || E'\n' || v_body, 'UTF8')), 'hex'), v_body);
end $$;

create or replace function public.ledger_capture() returns trigger
language plpgsql as $$
begin
  perform public.ledger_append(jsonb_build_object(
    'table', tg_table_name,
    'op', lower(tg_op),
    'actor', coalesce(nullif(current_setting('app.actor', true), ''), 'admin'),
    'at', now(),
    'row', case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  ));
  return null;
end $$;

create or replace function public.ledger_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger is append-only';
end $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists restaurants_updated_at on public.restaurants;
create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

drop trigger if exists restaurants_ledger on public.restaurants;
create trigger restaurants_ledger after insert or update or delete on public.restaurants
  for each row execute function public.ledger_capture();
drop trigger if exists deals_ledger on public.deals;
create trigger deals_ledger after insert or update or delete on public.deals
  for each row execute function public.ledger_capture();
drop trigger if exists proposals_ledger_insert on public.proposals;
create trigger proposals_ledger_insert after insert on public.proposals
  for each row execute function public.ledger_capture();
drop trigger if exists proposals_ledger_status on public.proposals;
create trigger proposals_ledger_status after update of status on public.proposals
  for each row when (old.status is distinct from new.status) execute function public.ledger_capture();
drop trigger if exists votes_ledger on public.votes;
create trigger votes_ledger after insert on public.votes
  for each row execute function public.ledger_capture();
drop trigger if exists ledger_no_update on public.ledger;
create trigger ledger_no_update before update or delete on public.ledger
  for each row execute function public.ledger_immutable();

-- ───────────── 提案与投票 ─────────────

create or replace function public.apply_proposal(p public.proposals) returns void
language plpgsql as $$
begin
  case p.kind
  when 'add_restaurant' then
    insert into public.restaurants (name, category, address, price_range, emoji, lat, lng, walk_minutes)
    values (p.payload->>'name', p.payload->>'category', p.payload->>'address',
            nullif(p.payload->>'price_range', ''), coalesce(nullif(p.payload->>'emoji', ''), '🍽️'),
            (p.payload->>'lat')::double precision, (p.payload->>'lng')::double precision,
            public.walk_minutes_from_campus((p.payload->>'lat')::double precision, (p.payload->>'lng')::double precision));
  when 'add_deal' then
    insert into public.deals (restaurant_id, kind, title, source, ends_on)
    values (p.restaurant_id, p.payload->>'deal_kind', p.payload->>'title',
            nullif(p.payload->>'source', ''), nullif(p.payload->>'ends_on', '')::date);
  when 'update_deal' then
    update public.deals set
      kind = coalesce(p.payload->>'deal_kind', kind),
      title = coalesce(p.payload->>'title', title),
      ends_on = case when p.payload ? 'ends_on' then nullif(p.payload->>'ends_on', '')::date else ends_on end,
      is_active = true,
      last_verified_on = current_date
    where id = p.deal_id;
  when 'remove_deal' then
    update public.deals set is_active = false, last_verified_on = current_date where id = p.deal_id;
  end case;
end $$;

-- 不同类型的提案需要几个人（含提案人）附证据确认才生效；反对也要达到同样人数才驳回。
-- 与 src/lib/types.ts 中的 THRESHOLDS 保持一致。
create or replace function public.proposal_threshold(p_kind text) returns int
language sql immutable as $$
  select case p_kind
    when 'remove_deal' then 2   -- 取消优惠：2 人确认
    else 1                      -- 新增优惠、修改优惠、新增店家：附照片提交即生效
  end
$$;

-- 投一票（附证据）。确认达到门槛且多于反对 → 生效；反对达到门槛且不少于确认 → 驳回。
-- p_threshold 参数已不再使用（门槛由 proposal_threshold 按类型决定），保留它只是为了兼容旧的调用。
create or replace function public.cast_vote(
  p_proposal bigint, p_user uuid, p_stance text,
  p_evidence_path text, p_evidence_sha256 text, p_ai_verdict text, p_ai_reason text,
  p_threshold int default 3
) returns jsonb
language plpgsql as $$
declare
  p public.proposals;
  v_confirm int;
  v_reject int;
  v_recent int;
  v_threshold int;
begin
  select * into p from public.proposals where id = p_proposal for update;
  if not found then raise exception 'not_found'; end if;
  if p.status <> 'pending' then raise exception 'closed'; end if;
  if p.expires_at < now() then
    update public.proposals set status = 'expired', resolved_at = now() where id = p.id;
    return jsonb_build_object('id', p.id, 'status', 'expired');
  end if;

  select count(*) into v_recent from public.votes where user_id = p_user and created_at > now() - interval '1 day';
  if v_recent >= 30 then raise exception 'rate_limited'; end if;

  perform set_config('app.actor', 'user:' || p_user, true);
  insert into public.votes (proposal_id, user_id, stance, evidence_path, evidence_sha256, ai_verdict, ai_reason)
  values (p.id, p_user, p_stance, p_evidence_path, p_evidence_sha256, p_ai_verdict, p_ai_reason);

  select count(*) filter (where stance = 'confirm'), count(*) filter (where stance = 'reject')
    into v_confirm, v_reject
  from public.votes where proposal_id = p.id;

  v_threshold := public.proposal_threshold(p.kind);
  if v_confirm >= v_threshold and v_confirm > v_reject then
    perform set_config('app.actor', 'proposal:' || p.id, true);
    perform public.apply_proposal(p);
    update public.proposals set status = 'applied', resolved_at = now() where id = p.id;
    -- 同一条优惠的其它待定提案已经过时
    if p.deal_id is not null then
      update public.proposals set status = 'expired', resolved_at = now()
      where deal_id = p.deal_id and status = 'pending' and id <> p.id;
    end if;
  elsif v_reject >= v_threshold and v_reject >= v_confirm then
    update public.proposals set status = 'rejected', resolved_at = now() where id = p.id;
  end if;

  return jsonb_build_object(
    'id', p.id,
    'status', (select status from public.proposals where id = p.id),
    'confirms', v_confirm,
    'rejects', v_reject,
    'threshold', v_threshold
  );
end $$;

-- 新建提案，提案人的证据自动算作第一票「确认」。
create or replace function public.create_proposal(
  p_kind text, p_restaurant_id bigint, p_deal_id bigint, p_payload jsonb, p_claim text, p_user uuid,
  p_evidence_path text, p_evidence_sha256 text, p_ai_verdict text, p_ai_reason text,
  p_threshold int default 3
) returns jsonb
language plpgsql as $$
declare
  v_id bigint;
  v_recent int;
begin
  select count(*) into v_recent from public.proposals where created_by = p_user and created_at > now() - interval '1 day';
  if v_recent >= 10 then raise exception 'rate_limited'; end if;

  if p_deal_id is not null and exists (
    select 1 from public.proposals where deal_id = p_deal_id and status = 'pending' and expires_at > now()
  ) then
    raise exception 'duplicate_pending';
  end if;

  perform set_config('app.actor', 'user:' || p_user, true);
  insert into public.proposals (kind, restaurant_id, deal_id, payload, claim, created_by)
  values (p_kind, p_restaurant_id, p_deal_id, coalesce(p_payload, '{}'::jsonb), p_claim, p_user)
  returning id into v_id;

  return public.cast_vote(v_id, p_user, 'confirm', p_evidence_path, p_evidence_sha256, p_ai_verdict, p_ai_reason, p_threshold);
end $$;

-- ───────────── 权限 ─────────────

alter table public.restaurants enable row level security;
alter table public.deals       enable row level security;
alter table public.proposals   enable row level security;
alter table public.votes       enable row level security;
alter table public.ledger      enable row level security;

-- 函数默认对所有人开放执行，必须收回：否则拿到 publishable key 的人可以直接调用 cast_vote 冒充别人投票。
revoke execute on all functions in schema public from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on all functions in schema public from anon, authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    -- 新版 Supabase 不再自动给新表授权，后端（secret key = service_role）需要显式授权；
    -- anon / authenticated（浏览器）不授予任何表权限。
    execute 'grant usage on schema public to service_role';
    execute 'grant select, insert, update, delete on all tables in schema public to service_role';
    execute 'grant usage, select on all sequences in schema public to service_role';
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;

-- 证据照片存放在私有的 Storage 桶里，由后端生成临时链接展示。
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false)
    on conflict (id) do nothing;
  end if;
end $$;

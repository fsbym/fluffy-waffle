-- 校园美食地图 数据库结构
-- 在 Supabase 控制台 → SQL Editor 中运行本文件，再运行 seed.sql。
-- 所有表都开启 RLS 且不设公开策略：浏览器无法直接读写，
-- 只能经过 Next.js 后端（使用 secret key）访问。

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
  source           text,                       -- 例如：店家、饭团、Uber Eats、用户提交
  starts_on        date,
  ends_on          date,                       -- 过期后前台自动隐藏
  last_verified_on date not null default current_date,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists deals_restaurant_id_idx on public.deals (restaurant_id);

create table if not exists public.submissions (
  id              bigint generated always as identity primary key,
  restaurant_id   bigint references public.restaurants(id) on delete set null,
  restaurant_name text not null,
  kind            text not null check (kind in ('discount', 'coupon')),
  title           text not null,
  source          text,
  ends_on         date,
  note            text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now()
);
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

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

alter table public.restaurants enable row level security;
alter table public.deals       enable row level security;
alter table public.submissions enable row level security;

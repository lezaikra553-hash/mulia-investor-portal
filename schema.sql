create extension if not exists pgcrypto;

create table if not exists public.investors(
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  code text unique not null,
  name text not null,
  username text unique not null,
  company_code text not null check(company_code in('BM','DM','AP')),
  company_name text not null,
  share_percent numeric(7,2) not null default 10,
  owner_percent numeric(7,2) not null default 60,
  saving_percent numeric(7,2) not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(abs((share_percent+owner_percent+saving_percent)-100)<0.001)
);

create table if not exists public.profiles(
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  role text not null check(role in('owner','investor')),
  investor_id uuid references public.investors(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_reports(
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  year int not null,
  month int not null check(month between 1 and 12),
  income numeric(18,2) not null default 0,
  operational numeric(18,2) not null default 0,
  profit_sharing_expense numeric(18,2) not null default 0,
  expense numeric(18,2) not null default 0,
  net_profit numeric(18,2) not null default 0,
  investor_share numeric(18,2) not null default 0,
  owner_share numeric(18,2) not null default 0,
  joint_savings numeric(18,2) not null default 0,
  published boolean not null default true,
  source text,
  updated_at timestamptz not null default now(),
  unique(investor_id,year,month)
);

create index if not exists idx_profiles_investor on public.profiles(investor_id);
create index if not exists idx_reports_investor_year on public.monthly_reports(investor_id,year);

alter table public.investors enable row level security;
alter table public.profiles enable row level security;
alter table public.monthly_reports enable row level security;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path=public
as $$select exists(select 1 from public.profiles p where p.auth_user_id=auth.uid() and p.role='owner')$$;

drop policy if exists profiles_read_own_or_owner on public.profiles;
create policy profiles_read_own_or_owner on public.profiles for select to authenticated
using(auth.uid()=auth_user_id or public.is_owner());

drop policy if exists investors_owner_all on public.investors;
create policy investors_owner_all on public.investors for all to authenticated
using(public.is_owner()) with check(public.is_owner());

drop policy if exists investors_read_self on public.investors;
create policy investors_read_self on public.investors for select to authenticated
using(auth_user_id=auth.uid() and active=true);

drop policy if exists reports_owner_all on public.monthly_reports;
create policy reports_owner_all on public.monthly_reports for all to authenticated
using(public.is_owner()) with check(public.is_owner());

drop policy if exists reports_investor_read on public.monthly_reports;
create policy reports_investor_read on public.monthly_reports for select to authenticated
using(
  published=true and exists(
    select 1 from public.investors i
    where i.id=monthly_reports.investor_id
      and i.auth_user_id=auth.uid()
      and i.active=true
  )
);

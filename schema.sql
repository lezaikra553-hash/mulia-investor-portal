create extension if not exists pgcrypto;

create table if not exists public.app_users(
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text unique not null,
  password_hash text not null,
  role text not null check(role in('owner','investor')),
  investor_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.investors(
  id uuid primary key default gen_random_uuid(),
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

alter table public.app_users
  drop constraint if exists app_users_investor_id_fkey;
alter table public.app_users
  add constraint app_users_investor_id_fkey foreign key(investor_id) references public.investors(id) on delete cascade;

create table if not exists public.app_sessions(
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null default(now()+interval '30 days'),
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
  updated_at timestamptz not null default now(),
  unique(investor_id,year,month)
);

-- GANTI kode setup berikut sebelum menjalankan SQL.
create table if not exists public.app_settings(
  key text primary key,
  value_hash text not null
);
insert into public.app_settings(key,value_hash)
values('owner_setup_code',crypt('GANTI-KODE-SETUP-INI',gen_salt('bf',10)))
on conflict(key) do nothing;

alter table public.app_users enable row level security;
alter table public.investors enable row level security;
alter table public.app_sessions enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.app_settings enable row level security;

revoke all on public.app_users,public.investors,public.app_sessions,public.monthly_reports,public.app_settings from anon,authenticated;

create or replace function public.session_user(p_token uuid)
returns table(user_id uuid,role text,investor_id uuid,full_name text)
language sql stable security definer set search_path=public
as $$
  select u.id,u.role,u.investor_id,u.full_name
  from app_sessions s join app_users u on u.id=s.user_id
  where s.token=p_token and s.expires_at>now() and u.active=true
$$;

create or replace function public.setup_status()
returns boolean language sql stable security definer set search_path=public
as $$select exists(select 1 from app_users where role='owner')$$;

create or replace function public.setup_owner(p_name text,p_username text,p_password text,p_setup_code text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare ok boolean;
begin
  if exists(select 1 from app_users where role='owner') then raise exception 'Akun Owner sudah tersedia.'; end if;
  if length(trim(p_name))<3 then raise exception 'Nama Owner belum valid.'; end if;
  if p_username !~ '^[a-zA-Z0-9._-]{3,30}$' then raise exception 'Format username tidak valid.'; end if;
  if length(p_password)<8 then raise exception 'Password minimal 8 karakter.'; end if;
  select value_hash=crypt(p_setup_code,value_hash) into ok from app_settings where key='owner_setup_code';
  if coalesce(ok,false)=false then raise exception 'Kode Setup tidak sesuai.'; end if;
  insert into app_users(full_name,username,password_hash,role)
  values(trim(p_name),lower(trim(p_username)),crypt(p_password,gen_salt('bf',10)),'owner');
  return true;
end $$;

create or replace function public.login_user(p_username text,p_password text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare u app_users%rowtype; t uuid;
begin
  select * into u from app_users where username=lower(trim(p_username)) and active=true;
  if u.id is null or u.password_hash<>crypt(p_password,u.password_hash) then
    raise exception 'Username atau password tidak sesuai.';
  end if;
  delete from app_sessions where expires_at<=now();
  insert into app_sessions(user_id) values(u.id) returning token into t;
  return jsonb_build_object('token',t,'role',u.role,'investor_id',u.investor_id,'full_name',u.full_name);
end $$;

create or replace function public.validate_session(p_token uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare r record;
begin
  select * into r from session_user(p_token);
  if r.user_id is null then return jsonb_build_object('valid',false); end if;
  return jsonb_build_object('valid',true,'role',r.role,'investor_id',r.investor_id,'full_name',r.full_name);
end $$;

create or replace function public.logout_user(p_token uuid)
returns boolean language plpgsql security definer set search_path=public
as $$begin delete from app_sessions where token=p_token; return true; end $$;

create or replace function public.get_investors(p_token uuid)
returns setof public.investors language plpgsql security definer set search_path=public
as $$
declare r record;
begin
  select * into r from session_user(p_token);
  if r.user_id is null then raise exception 'Sesi tidak valid.'; end if;
  if r.role='owner' then
    return query select * from investors order by created_at;
  else
    return query select * from investors where id=r.investor_id and active=true;
  end if;
end $$;

create or replace function public.get_reports(p_token uuid,p_investor_id uuid,p_year int)
returns setof public.monthly_reports language plpgsql security definer set search_path=public
as $$
declare r record;
begin
  select * into r from session_user(p_token);
  if r.user_id is null then raise exception 'Sesi tidak valid.'; end if;
  if r.role='investor' and r.investor_id<>p_investor_id then raise exception 'Akses ditolak.'; end if;
  return query select * from monthly_reports
  where investor_id=p_investor_id and year=p_year and (r.role='owner' or published=true)
  order by month;
end $$;

create or replace function public.owner_save_investor(
  p_token uuid,p_id uuid,p_name text,p_username text,p_password text,
  p_company_code text,p_company_name text,p_share_percent numeric,
  p_owner_percent numeric,p_saving_percent numeric,p_active boolean
)
returns uuid language plpgsql security definer set search_path=public
as $$
declare r record; inv_id uuid; user_id uuid; code_value text;
begin
  select * into r from session_user(p_token);
  if r.role is distinct from 'owner' then raise exception 'Hanya Owner yang dapat menyimpan investor.'; end if;
  if p_username !~ '^[a-zA-Z0-9._-]{3,30}$' then raise exception 'Format username tidak valid.'; end if;
  if abs((p_share_percent+p_owner_percent+p_saving_percent)-100)>0.001 then raise exception 'Total persentase harus 100%%.'; end if;

  if p_id is null then
    if p_password is null or length(p_password)<8 then raise exception 'Password minimal 8 karakter.'; end if;
    code_value='INV-'||to_char(now(),'YYMMDDHH24MISS');
    insert into investors(code,name,username,company_code,company_name,share_percent,owner_percent,saving_percent,active)
    values(code_value,trim(p_name),lower(trim(p_username)),p_company_code,p_company_name,p_share_percent,p_owner_percent,p_saving_percent,p_active)
    returning id into inv_id;
    insert into app_users(full_name,username,password_hash,role,investor_id,active)
    values(trim(p_name),lower(trim(p_username)),crypt(p_password,gen_salt('bf',10)),'investor',inv_id,p_active);
  else
    inv_id=p_id;
    update investors set name=trim(p_name),username=lower(trim(p_username)),company_code=p_company_code,
      company_name=p_company_name,share_percent=p_share_percent,owner_percent=p_owner_percent,
      saving_percent=p_saving_percent,active=p_active,updated_at=now()
    where id=inv_id;
    select id into user_id from app_users where investor_id=inv_id;
    update app_users set full_name=trim(p_name),username=lower(trim(p_username)),active=p_active where id=user_id;
    if p_password is not null and length(p_password)>0 then
      if length(p_password)<8 then raise exception 'Password minimal 8 karakter.'; end if;
      update app_users set password_hash=crypt(p_password,gen_salt('bf',10)) where id=user_id;
    end if;
  end if;
  return inv_id;
end $$;

create or replace function public.owner_upsert_reports(
  p_token uuid,p_investor_id uuid,p_year int,p_rows jsonb
)
returns boolean language plpgsql security definer set search_path=public
as $$
declare r record; item jsonb;
begin
  select * into r from session_user(p_token);
  if r.role is distinct from 'owner' then raise exception 'Hanya Owner yang dapat menyimpan laporan.'; end if;
  for item in select * from jsonb_array_elements(p_rows)
  loop
    insert into monthly_reports(
      investor_id,year,month,income,operational,profit_sharing_expense,expense,net_profit,
      investor_share,owner_share,joint_savings,published,updated_at
    ) values(
      p_investor_id,p_year,(item->>'month')::int,
      coalesce((item->>'income')::numeric,0),coalesce((item->>'operational')::numeric,0),
      coalesce((item->>'profit_sharing_expense')::numeric,0),coalesce((item->>'expense')::numeric,0),
      coalesce((item->>'net_profit')::numeric,0),coalesce((item->>'investor_share')::numeric,0),
      coalesce((item->>'owner_share')::numeric,0),coalesce((item->>'joint_savings')::numeric,0),
      coalesce((item->>'published')::boolean,true),now()
    )
    on conflict(investor_id,year,month) do update set
      income=excluded.income,operational=excluded.operational,
      profit_sharing_expense=excluded.profit_sharing_expense,expense=excluded.expense,
      net_profit=excluded.net_profit,investor_share=excluded.investor_share,
      owner_share=excluded.owner_share,joint_savings=excluded.joint_savings,
      published=excluded.published,updated_at=now();
  end loop;
  return true;
end $$;

grant execute on function public.setup_status() to anon;
grant execute on function public.setup_owner(text,text,text,text) to anon;
grant execute on function public.login_user(text,text) to anon;
grant execute on function public.validate_session(uuid) to anon;
grant execute on function public.logout_user(uuid) to anon;
grant execute on function public.get_investors(uuid) to anon;
grant execute on function public.get_reports(uuid,uuid,int) to anon;
grant execute on function public.owner_save_investor(uuid,uuid,text,text,text,text,text,numeric,numeric,numeric,boolean) to anon;
grant execute on function public.owner_upsert_reports(uuid,uuid,int,jsonb) to anon;

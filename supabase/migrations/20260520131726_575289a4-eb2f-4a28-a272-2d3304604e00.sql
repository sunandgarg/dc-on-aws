
create table if not exists public.lp_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  source text not null default 'upload',
  total int not null default 0,
  success int not null default 0,
  duplicate int not null default 0,
  fail int not null default 0,
  status text not null default 'pending',
  payload jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key text not null unique,
  is_active boolean not null default true,
  rate_limit_per_minute int not null default 60,
  allowed_ips text[] not null default '{}',
  default_source text default '',
  default_medium text default '',
  default_campaign text default '',
  notes text default '',
  last_used_at timestamptz,
  call_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_utm_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  destination_url text not null,
  utm_source text default '',
  utm_medium text default '',
  utm_campaign text default '',
  utm_term text default '',
  utm_content text default '',
  click_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lp_batches enable row level security;
alter table public.lp_api_keys enable row level security;
alter table public.lp_utm_links enable row level security;

do $$ begin
  create policy "Admins manage lp_batches" on public.lp_batches for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins manage lp_api_keys" on public.lp_api_keys for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins manage lp_utm_links" on public.lp_utm_links for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;

create trigger update_lp_batches_updated_at before update on public.lp_batches
  for each row execute function public.update_updated_at_column();
create trigger update_lp_api_keys_updated_at before update on public.lp_api_keys
  for each row execute function public.update_updated_at_column();
create trigger update_lp_utm_links_updated_at before update on public.lp_utm_links
  for each row execute function public.update_updated_at_column();

create or replace function public.lp_increment_batch_success(batch_uuid uuid)
returns void language sql security definer set search_path = public as $$
  update public.lp_batches set success = success + 1, updated_at = now() where id = batch_uuid;
$$;
create or replace function public.lp_increment_batch_duplicate(batch_uuid uuid)
returns void language sql security definer set search_path = public as $$
  update public.lp_batches set duplicate = duplicate + 1, updated_at = now() where id = batch_uuid;
$$;
create or replace function public.lp_increment_batch_fail(batch_uuid uuid)
returns void language sql security definer set search_path = public as $$
  update public.lp_batches set fail = fail + 1, updated_at = now() where id = batch_uuid;
$$;

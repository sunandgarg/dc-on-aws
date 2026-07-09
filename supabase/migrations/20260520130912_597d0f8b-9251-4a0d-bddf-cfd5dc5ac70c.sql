
create extension if not exists pg_net;

create table if not exists public.lp_universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_url text not null,
  api_type text not null default 'generic',
  college_id text default '',
  secret_key text default '',
  source text default '',
  medium text default '',
  campaign text default '',
  auth_type text not null default 'none',
  auth_header_key text default '',
  auth_header_value text default '',
  custom_headers jsonb not null default '{}'::jsonb,
  column_mapping jsonb not null default '{}'::jsonb,
  static_fields jsonb not null default '{}'::jsonb,
  university_defaults jsonb not null default '{}'::jsonb,
  payload_wrapper text not null default 'object',
  leads_per_minute int not null default 30,
  is_active boolean not null default true,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  priority int not null default 100,
  is_active boolean not null default true,
  match_cities text[] not null default '{}',
  match_states text[] not null default '{}',
  match_courses text[] not null default '{}',
  match_sources text[] not null default '{}',
  match_ctas text[] not null default '{}',
  match_all boolean not null default false,
  university_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_marketing_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  rule_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_multi_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  flow_ids uuid[] not null default '{}',
  trigger_event text not null default 'lead_insert',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_push_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  university_id uuid,
  rule_id uuid,
  flow_id uuid,
  multi_flow_id uuid,
  status text not null default 'Pending',
  http_status int,
  request_payload jsonb,
  response_body text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lp_push_logs_lead on public.lp_push_logs(lead_id);
create index if not exists idx_lp_push_logs_university on public.lp_push_logs(university_id);
create index if not exists idx_lp_push_logs_created on public.lp_push_logs(created_at desc);

alter table public.lp_universities enable row level security;
alter table public.lp_automation_rules enable row level security;
alter table public.lp_marketing_flows enable row level security;
alter table public.lp_multi_flows enable row level security;
alter table public.lp_push_logs enable row level security;

do $$ begin
  create policy "Admins manage lp_universities" on public.lp_universities for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins manage lp_automation_rules" on public.lp_automation_rules for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins manage lp_marketing_flows" on public.lp_marketing_flows for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins manage lp_multi_flows" on public.lp_multi_flows for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins manage lp_push_logs" on public.lp_push_logs for all
    using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;

create trigger update_lp_universities_updated_at before update on public.lp_universities
  for each row execute function public.update_updated_at_column();
create trigger update_lp_automation_rules_updated_at before update on public.lp_automation_rules
  for each row execute function public.update_updated_at_column();
create trigger update_lp_marketing_flows_updated_at before update on public.lp_marketing_flows
  for each row execute function public.update_updated_at_column();
create trigger update_lp_multi_flows_updated_at before update on public.lp_multi_flows
  for each row execute function public.update_updated_at_column();

-- Async dispatch on new lead insert
create or replace function public.lp_dispatch_on_lead_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
begin
  fn_url := 'https://hpjbwtnvtktezwhafuuf.supabase.co/functions/v1/lp-dispatch-lead';
  begin
    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('lead_id', NEW.id)
    );
  exception when others then
    -- swallow; never break lead insert
    null;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_lp_dispatch_on_lead_insert on public.leads;
create trigger trg_lp_dispatch_on_lead_insert
after insert on public.leads
for each row execute function public.lp_dispatch_on_lead_insert();

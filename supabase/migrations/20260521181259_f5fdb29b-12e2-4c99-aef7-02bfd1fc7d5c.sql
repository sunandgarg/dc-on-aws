create extension if not exists pg_net;

alter table public.lp_automation_rules
  add column if not exists prefills jsonb not null default '{}'::jsonb,
  add column if not exists auto_dispatch boolean not null default true;

create index if not exists idx_leads_created_at_desc on public.leads(created_at desc);
create index if not exists idx_leads_city_state_course on public.leads(city, state, interested_course_slug);
create index if not exists idx_lp_rules_active_auto_priority on public.lp_automation_rules(is_active, auto_dispatch, priority);
create index if not exists idx_lp_logs_uni_created on public.lp_push_logs(university_id, created_at desc);
create index if not exists idx_lp_logs_lead_created on public.lp_push_logs(lead_id, created_at desc);

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
    null;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_lp_dispatch_on_lead_insert on public.leads;
create trigger trg_lp_dispatch_on_lead_insert
after insert on public.leads
for each row execute function public.lp_dispatch_on_lead_insert();
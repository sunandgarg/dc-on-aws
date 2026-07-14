create table if not exists public.ai_runtime_controls (
  feature text primary key,
  display_name text not null,
  is_enabled boolean not null default true,
  provider text,
  model text,
  stop_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ai_runtime_controls enable row level security;

drop policy if exists "Admins read AI runtime controls" on public.ai_runtime_controls;
create policy "Admins read AI runtime controls" on public.ai_runtime_controls
for select to authenticated using (
  exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
);

drop policy if exists "Admins update AI runtime controls" on public.ai_runtime_controls;
create policy "Admins update AI runtime controls" on public.ai_runtime_controls
for update to authenticated using (
  exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
) with check (
  exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
);

insert into public.ai_runtime_controls (feature, display_name, provider, model) values
  ('global', 'All AI calls', null, null),
  ('counselor', 'Diya student counselor', 'gemini', 'gemini-3.5-flash'),
  ('data-cleaner', 'Official data cleaner', 'anthropic', 'auto-sonnet'),
  ('blog-studio', 'Editorial blog studio', 'anthropic', 'auto-sonnet'),
  ('blog-agent', 'Automatic blog agent', 'anthropic', 'auto-sonnet'),
  ('admin-ai-generate', 'Bulk content generator', null, null),
  ('blog-image', 'Blog cover generation', 'openai', 'gpt-image-1')
on conflict (feature) do nothing;

create or replace function public.set_ai_emergency_stop(_stopped boolean, _reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Admin permission required';
  end if;

  update public.ai_runtime_controls
  set is_enabled = not _stopped,
      stop_reason = case when _stopped then coalesce(nullif(trim(_reason), ''), 'Stopped by an administrator') else null end,
      updated_by = auth.uid(), updated_at = now()
  where feature = 'global';

  if _stopped and to_regclass('public.data_cleaning_jobs') is not null then
    execute 'update public.data_cleaning_jobs set status = ''cancelled'', message = ''Stopped by AI emergency control'', updated_at = now() where status in (''queued'', ''running'', ''paused'')';
    execute 'update public.data_cleaning_items set status = ''cancelled'', error_message = ''Stopped by AI emergency control'', completed_at = now(), updated_at = now() where status in (''queued'', ''processing'')';
  end if;
  if _stopped and to_regclass('public.blog_auto_agent_settings') is not null then
    execute 'update public.blog_auto_agent_settings set enabled = false, updated_at = now() where id = ''default''';
  end if;
  if _stopped and to_regclass('public.blog_auto_agent_runs') is not null then
    execute 'update public.blog_auto_agent_runs set status = ''failed'', current_step = ''Stopped by AI emergency control'', finished_at = now() where status = ''running''';
  end if;
end;
$$;

grant execute on function public.set_ai_emergency_stop(boolean, text) to authenticated;
grant select, update on public.ai_runtime_controls to authenticated;

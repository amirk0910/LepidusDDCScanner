begin;

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  filename text not null check (char_length(filename) between 1 and 255 and filename !~ '[/\\\x00-\x1f\x7f]'),
  size_bytes integer not null check (size_bytes between 1 and 1048576),
  duration_ms integer not null check (duration_ms >= 0),
  risk text not null check (risk in ('None', 'Low', 'Medium', 'High', 'Critical')),
  total_findings integer not null check (total_findings >= 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.scan_findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  detector text not null check (detector in ('email', 'uk_phone', 'uk_nino', 'payment_card')),
  risk text not null check (risk in ('Low', 'Medium', 'High', 'Critical')),
  count integer not null check (count > 0),
  masked_example text not null check (char_length(masked_example) <= 320 and position('*' in masked_example) > 0),
  constraint scan_findings_scan_id_owner_id_fkey foreign key (scan_id, owner_id)
    references public.scans(id, owner_id) on delete cascade,
  unique (scan_id, detector)
);

create index scans_owner_created_idx on public.scans (owner_id, created_at desc, id desc);
create index scan_findings_owner_scan_idx on public.scan_findings (owner_id, scan_id);

alter table public.scans enable row level security;
alter table public.scans force row level security;
alter table public.scan_findings enable row level security;
alter table public.scan_findings force row level security;

create policy "Read own scans" on public.scans for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Delete own scans" on public.scans for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "Read own findings" on public.scan_findings for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.scans s where s.id = scan_id and s.owner_id = (select auth.uid())
  ));

revoke all on public.scans, public.scan_findings from anon, authenticated;
grant select, delete on public.scans to authenticated;
grant select on public.scan_findings to authenticated;

-- This is the only write path. Ownership is derived from the verified JWT, never a caller parameter.
create function public.save_scan(
  p_filename text,
  p_size_bytes integer,
  p_duration_ms integer,
  p_findings jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_scan uuid;
  v_item jsonb;
  v_type text;
  v_risk text;
  v_mask text;
  v_count integer;
  v_rank integer := 0;
  v_item_rank integer;
  v_total integer := 0;
  v_seen text[] := '{}';
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_findings is null or jsonb_typeof(p_findings) <> 'array' then
    raise exception 'Findings must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_findings) > 4 then raise exception 'Too many detector types' using errcode = '22023'; end if;

  insert into public.scans (owner_id, filename, size_bytes, duration_ms, risk, total_findings)
    values (v_owner, p_filename, p_size_bytes, p_duration_ms, 'None', 0) returning id into v_scan;

  for v_item in select value from jsonb_array_elements(p_findings) loop
    if jsonb_typeof(v_item) <> 'object' or
       not (v_item ?& array['detector', 'risk', 'count', 'masked_example']) or
       (select count(*) from jsonb_object_keys(v_item)) <> 4 or
       jsonb_typeof(v_item->'count') <> 'number' then
      raise exception 'Invalid finding shape' using errcode = '22023';
    end if;
    v_type := v_item->>'detector';
    v_mask := v_item->>'masked_example';
    if v_type = any(v_seen) then raise exception 'Duplicate detector' using errcode = '22023'; end if;
    v_seen := array_append(v_seen, v_type);
    v_count := (v_item->>'count')::integer;
    if v_count < 1 or v_count > 1048576 then raise exception 'Invalid count' using errcode = '22023'; end if;

    case v_type
      when 'email' then
        v_risk := 'Low'; v_item_rank := 1;
        if v_mask !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]\*{3}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$' then
          raise exception 'Email example must be masked' using errcode = '22023';
        end if;
      when 'uk_phone' then
        v_risk := 'Medium'; v_item_rank := 2;
        if v_mask !~ '^(\+44|0[127])\*{6}[0-9]{3}$' then raise exception 'Phone example must be masked' using errcode = '22023'; end if;
      when 'uk_nino' then
        v_risk := 'High'; v_item_rank := 3;
        if v_mask !~ '^[A-Z]{2}\*{6}[A-D]?$' then raise exception 'NINO example must be masked' using errcode = '22023'; end if;
      when 'payment_card' then
        v_risk := 'Critical'; v_item_rank := 4;
        if v_mask !~ '^\*{9,15}[0-9]{4}$' then raise exception 'Card example must be masked' using errcode = '22023'; end if;
      else raise exception 'Unknown detector' using errcode = '22023';
    end case;
    if v_mask is null or v_item->>'risk' is distinct from v_risk then raise exception 'Invalid masked finding' using errcode = '22023'; end if;
    insert into public.scan_findings (scan_id, owner_id, detector, risk, count, masked_example)
      values (v_scan, v_owner, v_type, v_risk, v_count, v_mask);
    v_total := v_total + v_count;
    v_rank := greatest(v_rank, v_item_rank);
  end loop;

  update public.scans set
    total_findings = v_total,
    risk = (array['None', 'Low', 'Medium', 'High', 'Critical'])[v_rank + 1]
    where id = v_scan and owner_id = v_owner;
  return v_scan;
end;
$$;

revoke all on function public.save_scan(text, integer, integer, jsonb) from public, anon;
grant execute on function public.save_scan(text, integer, integer, jsonb) to authenticated;

commit;

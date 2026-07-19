-- สรุปยอดสำหรับปฏิทินใน Postgres เพื่อให้ numeric(12,2) ถูกบวกที่ฐานข้อมูล
-- ไม่ปัด/รวมเงินซ้ำใน JavaScript และยังคงใช้ RLS ของ transactions ตามผู้ใช้
create function transaction_calendar_summary(
  p_from date,
  p_to date,
  p_scope text,
  p_kind category_kind default null,
  p_category uuid default null,
  p_account uuid default null,
  p_min numeric default null,
  p_max numeric default null,
  p_q text default null
)
returns table (
  bucket_start date,
  income numeric(12, 2),
  expense numeric(12, 2),
  net numeric(12, 2),
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    case
      when p_scope = 'year' then date_trunc('month', t.occurred_on)::date
      else t.occurred_on
    end as bucket_start,
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(12, 2) as income,
    coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(12, 2) as expense,
    (
      coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)
      - coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)
    )::numeric(12, 2) as net,
    count(*)::bigint as transaction_count
  from transactions t
  where p_from <= p_to
    and p_scope in ('day', 'week', 'month', 'year')
    and t.occurred_on between p_from and p_to
    and (p_kind is null or t.kind = p_kind)
    and (p_category is null or t.category_id = p_category)
    and (p_account is null or t.account_id = p_account)
    and (p_min is null or t.amount >= p_min)
    and (p_max is null or t.amount <= p_max)
    and (p_q is null or t.note ilike '%' || p_q || '%')
  group by 1
  order by 1;
$$;

-- ฟังก์ชันใน public ได้ EXECUTE จาก PUBLIC อัตโนมัติ ต้องปิดก่อนให้เฉพาะ role ที่ใช้
revoke all on function transaction_calendar_summary(
  date, date, text, category_kind, uuid, uuid, numeric, numeric, text
) from public, anon;

grant execute on function transaction_calendar_summary(
  date, date, text, category_kind, uuid, uuid, numeric, numeric, text
) to authenticated, service_role;

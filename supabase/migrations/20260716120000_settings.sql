-- หน้าตั้งค่าบัญชี: รอบเดือนกำหนดเอง, สกุลเงินที่ใช้จริง, แจ้งเตือนในแอป

-- ────────────────────────────────────────────────────────────────
-- รอบเดือนกำหนดเอง
-- ────────────────────────────────────────────────────────────────
-- จำกัดที่ 1–28 เพราะทุกเดือนมีวันที่ 28 เสมอ ถ้าให้เลือก 31 แล้วเดือน
-- กุมภาพันธ์จะไม่มีวันเริ่มรอบ
alter table profiles
add column cycle_start_day int not null default 1
check (cycle_start_day between 1 and 28);

-- period ระบุด้วย "เดือนที่รอบเริ่ม" ไม่ใช่ช่วงวันที่
-- cycle_start_day = 25 → period '2026-07-01' หมายถึงช่วง 25 ก.ค. ถึง 24 ส.ค.
--
-- ที่เลือกแบบนี้เพราะ cycle_start_day = 1 ให้ผลเท่ากับ date_trunc('month', d)
-- เป๊ะ ๆ → budgets.period_month กับ check constraint เดิมใช้ต่อได้ ไม่ต้อง
-- migrate ข้อมูลที่มีอยู่ และการเปลี่ยนรอบก็ไม่ทำให้งบที่ตั้งไว้หลุด
create function period_of(d date, cycle_day int) returns date
immutable
language sql
as $$
  select case
    when extract(day from d) >= cycle_day then date_trunc('month', d)::date
    else (date_trunc('month', d) - interval '1 month')::date
  end;
$$;

-- ────────────────────────────────────────────────────────────────
-- สกุลเงิน
-- ────────────────────────────────────────────────────────────────
-- บัญชีหนึ่งใช้สกุลเดียว ไม่มีการแปลงค่า — เปลี่ยนสกุลคือเปลี่ยนสัญลักษณ์
-- ที่แสดง ยอดที่บันทึกไว้ไม่ถูกแตะ (UI บอกผู้ใช้ตรง ๆ)
alter table profiles
add constraint profiles_currency_supported
check (currency in ('THB', 'USD', 'EUR', 'GBP', 'JPY'));

-- ────────────────────────────────────────────────────────────────
-- แจ้งเตือนในแอป
-- ────────────────────────────────────────────────────────────────
-- ไม่เก็บ "การแจ้งเตือน" เป็นแถว เพราะสถานะงบคำนวณจาก v_budget_usage ได้อยู่แล้ว
-- เก็บแค่ "อันไหนที่ผู้ใช้ปิดไปแล้ว" → ไม่ต้องมี cron ไม่มีงานเบื้องหลัง
-- ไม่มีทางแจ้งเตือนค้างเมื่อยอดเปลี่ยนจนหลุดขอบ
create table dismissed_alerts (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  period_month date not null,
  threshold int not null check (threshold in (80, 100)),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, category_id, period_month, threshold)
);

alter table dismissed_alerts enable row level security;

create policy "dismissed_alerts: เจ้าของเท่านั้น" on dismissed_alerts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, delete on dismissed_alerts to authenticated;
grant select, insert, update, delete on dismissed_alerts to service_role;

-- ────────────────────────────────────────────────────────────────
-- รื้อ view ให้รู้จักรอบเดือนของผู้ใช้
-- ────────────────────────────────────────────────────────────────
drop view v_budget_usage;
drop view v_running_balance;
drop view v_monthly_summary;

create view v_monthly_summary
with (security_invoker = true) as
select
  t.user_id,
  period_of(t.occurred_on, p.cycle_start_day) as period_month,
  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(12, 2)
    as income,
  coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(12, 2)
    as expense,
  (
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)
    - coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)
  )::numeric(12, 2) as net
from transactions t
inner join profiles p on p.id = t.user_id
group by t.user_id, period_of(t.occurred_on, p.cycle_start_day);

create view v_running_balance
with (security_invoker = true) as
select
  user_id,
  period_month,
  income,
  expense,
  net,
  sum(net) over (
    partition by user_id
    order by period_month
    rows between unbounded preceding and current row
  )::numeric(12, 2) as balance
from v_monthly_summary;

-- ขอบเขต status ต้องตรงกับ budgetStatus() ใน lib/money.ts เป๊ะ
-- และคิดจาก pct ที่ปัดแล้วตัวเดียวกับที่ UI แสดง ไม่งั้น badge จะขัดกับตัวเลขบนจอ
create view v_budget_usage
with (security_invoker = true) as
select
  u.*,
  p.pct,
  case
    when p.pct > 100 then 'over'
    when p.pct >= 80 then 'warn'
    else 'ok'
  end as status
from (
  select
    b.user_id,
    b.period_month,
    b.category_id,
    c.name as category_name,
    b.amount as budget_amount,
    coalesce(s.spent, 0)::numeric(12, 2) as spent
  from budgets b
  inner join categories c on c.id = b.category_id
  inner join profiles pr on pr.id = b.user_id
  left join lateral (
    select sum(t.amount) as spent
    from transactions t
    where
      t.user_id = b.user_id
      and t.category_id = b.category_id
      and t.kind = 'expense'
      and period_of(t.occurred_on, pr.cycle_start_day) = b.period_month
  ) s on true
) u
cross join lateral (
  select case
    when u.budget_amount > 0 then round(u.spent / u.budget_amount * 100, 1)
    else 0
  end as pct
) p;

grant select on v_monthly_summary to authenticated, service_role;
grant select on v_running_balance to authenticated, service_role;
grant select on v_budget_usage to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────
-- รีเซ็ตหมวดหมู่กลับค่าเริ่มต้น
-- ────────────────────────────────────────────────────────────────
-- ใช้ชุดเดียวกับ handle_new_user เพื่อไม่ให้รายการเริ่มต้นแตกเป็นสองที่
-- เพิ่มเฉพาะที่ยังไม่มี ไม่แตะหมวดที่ผู้ใช้สร้างเอง และไม่ลบอะไรทั้งสิ้น
-- (รายการเก่าอ้างหมวดอยู่ — FK เป็น on delete restrict)
create function seed_default_categories(target uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, kind, sort_order) values
    (target, 'อาหาร', 'expense', 1),
    (target, 'เดินทาง', 'expense', 2),
    (target, 'ที่พัก', 'expense', 3),
    (target, 'บันเทิง', 'expense', 4),
    (target, 'ช้อปปิ้ง', 'expense', 5),
    (target, 'สุขภาพ', 'expense', 6),
    (target, 'อื่น ๆ', 'expense', 99),
    (target, 'เงินเดือน', 'income', 1),
    (target, 'รายได้เสริม', 'income', 2),
    (target, 'อื่น ๆ', 'income', 99)
  on conflict (user_id, name, kind) do update
    set is_archived = false;
end;
$$;

-- security definer + ไม่รับ argument → ผู้ใช้เรียกได้เฉพาะของตัวเอง
-- ส่ง uuid ของคนอื่นเข้ามาไม่ได้
create function reset_my_categories() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;
  perform public.seed_default_categories(auth.uid());
end;
$$;

revoke all on function seed_default_categories(uuid) from public, anon, authenticated;
grant execute on function reset_my_categories() to authenticated;

-- ────────────────────────────────────────────────────────────────
-- ลบบัญชีตัวเอง
-- ────────────────────────────────────────────────────────────────
-- ทุกตารางอ้าง auth.users(id) on delete cascade → ลบ user แถวเดียวก็หายหมด
-- ในทรานแซกชันเดียว ไม่ต้องไล่ลบทีละตารางให้ค้างครึ่ง ๆ กลาง ๆ
--
-- ลบแถวใน auth.users ต้องใช้สิทธิ์สูงกว่าที่ authenticated มี จึงต้องเป็น
-- security definer แต่ไม่รับ argument และอ่าน auth.uid() เอง → เรียกลบบัญชี
-- คนอื่นไม่ได้ ต่อให้ยิง rpc ตรง
create function delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

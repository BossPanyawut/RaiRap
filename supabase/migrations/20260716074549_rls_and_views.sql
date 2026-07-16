-- RLS คือชั้น authorization จริงของแอปนี้ ไม่ใช่ UI
-- ทุก policy ห่อ auth.uid() ด้วย (select ...) เพื่อให้ planner ประเมินครั้งเดียวต่อ statement
-- แทนที่จะเรียกใหม่ทุกแถว (คำแนะนำ performance ของ Supabase)

alter table profiles enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

-- GRANT กับ POLICY เป็นคนละชั้น ต้องมีทั้งคู่:
-- GRANT เปิดประตูระดับตาราง, POLICY กรองว่าเห็นแถวไหน
-- ไม่มี GRANT = "42501 permission denied" ต่อให้ policy ผ่าน
grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on categories to authenticated;
grant select, insert, update, delete on transactions to authenticated;
grant select, insert, update, delete on budgets to authenticated;

-- anon ไม่ได้อะไรเลย — ยังไม่ล็อกอินก็ไม่มีสิทธิ์แตะ ปิดตั้งแต่ชั้น privilege
-- ก่อนจะถึง RLS ด้วยซ้ำ

create policy "profiles: เจ้าของเท่านั้น" on profiles
for all to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "categories: เจ้าของเท่านั้น" on categories
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "transactions: เจ้าของเท่านั้น" on transactions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "budgets: เจ้าของเท่านั้น" on budgets
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ยอดรวมรายเดือน
-- security_invoker = true สำคัญมาก — ค่า default ของ view คือรันด้วยสิทธิ์ผู้สร้าง
-- ซึ่งจะ "ข้าม RLS" ของตารางข้างใต้ทั้งหมด
create view v_monthly_summary
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.occurred_on)::date as period_month,
  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(12, 2)
    as income,
  coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(12, 2)
    as expense,
  (
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)
    - coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)
  )::numeric(12, 2) as net
from transactions t
group by t.user_id, date_trunc('month', t.occurred_on)::date;

-- ยกยอดคงเหลือสะสมข้ามเดือน (spec 2.3)
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

-- งบ vs ใช้จริง (spec 2.2)
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
  left join lateral (
    select sum(t.amount) as spent
    from transactions t
    where
      t.user_id = b.user_id
      and t.category_id = b.category_id
      and t.kind = 'expense'
      and date_trunc('month', t.occurred_on)::date = b.period_month
  ) s on true
) u
cross join lateral (
  select case
    when u.budget_amount > 0 then round(u.spent / u.budget_amount * 100, 1)
    else 0
  end as pct
) p;

grant select on v_monthly_summary to authenticated;
grant select on v_running_balance to authenticated;
grant select on v_budget_usage to authenticated;

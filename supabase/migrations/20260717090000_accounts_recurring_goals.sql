-- spec 2.5 หลายบัญชี/กระเป๋าเงิน + รายการเกิดซ้ำ, spec 2.3 เป้าหมายการออม

-- ────────────────────────────────────────────────────────────────
-- บัญชี / กระเป๋าเงิน (spec 2.5)
-- ────────────────────────────────────────────────────────────────
create type account_kind as enum ('cash', 'bank', 'credit', 'ewallet');

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind account_kind not null default 'cash',
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- nullable โดยตั้งใจ — รายการเก่าทั้งหมดไม่มีบัญชี และผู้ใช้ที่ไม่สนใจฟีเจอร์นี้
-- ก็ไม่ต้องเลือกบัญชีทุกครั้ง บังคับ not null จะทำให้ข้อมูลเดิม migrate ไม่ได้
alter table transactions
add column account_id uuid references accounts (id) on delete set null;

create index transactions_user_account_idx on transactions (user_id, account_id);

alter table accounts enable row level security;

create policy "accounts: เจ้าของเท่านั้น" on accounts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on accounts to authenticated, service_role;

-- ยอดคงเหลือแยกตามบัญชี
create view v_account_balance
with (security_invoker = true) as
select
  a.user_id,
  a.id as account_id,
  a.name,
  a.kind,
  a.is_archived,
  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(12, 2)
    as income,
  coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(12, 2)
    as expense,
  (
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)
    - coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)
  )::numeric(12, 2) as balance
from accounts a
left join transactions t on t.account_id = a.id
group by a.user_id, a.id, a.name, a.kind, a.is_archived;

grant select on v_account_balance to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────
-- รายการเกิดซ้ำอัตโนมัติ (spec 2.5)
-- ────────────────────────────────────────────────────────────────
create type recur_freq as enum ('daily', 'weekly', 'monthly', 'yearly');

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  kind category_kind not null,
  account_id uuid references accounts (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  freq recur_freq not null,
  -- ทุก ๆ n หน่วยของ freq (freq=monthly, interval=3 → ทุกไตรมาส)
  every int not null default 1 check (every between 1 and 99),
  starts_on date not null,
  -- null = ไม่มีวันจบ
  ends_on date,
  -- ครั้งล่าสุดที่สร้างรายการจริงไปแล้ว null = ยังไม่เคยสร้าง
  last_run_on date,
  is_paused boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  foreign key (category_id, kind) references categories (id, kind) on delete restrict
);

create index recurring_rules_user_idx on recurring_rules (user_id, is_paused);

alter table recurring_rules enable row level security;

create policy "recurring_rules: เจ้าของเท่านั้น" on recurring_rules
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on recurring_rules to authenticated, service_role;

-- รายการที่ถูกสร้างจากกฎ ผูกกลับไปที่กฎและวันที่ของงวด
-- unique (rule_id, occurred_on) คือหัวใจ: เรียกซ้ำกี่รอบก็ไม่เกิดรายการซ้ำ
-- ไม่ต้องพึ่ง last_run_on ให้ถูกต้อง 100% ฐานข้อมูลกันซ้ำให้เอง
alter table transactions
add column recurring_rule_id uuid references recurring_rules (id) on delete set null,
add column recurring_occurred_on date;

create unique index transactions_recurring_once_idx
on transactions (recurring_rule_id, recurring_occurred_on)
where recurring_rule_id is not null;

-- สร้างรายการที่ถึงกำหนดแล้วแต่ยังไม่ถูกสร้าง จนถึงวันนี้
-- เรียกตอนผู้ใช้เปิดแอป ไม่ใช้ cron — ถ้าไม่เปิดแอปก็ยังไม่มีใครต้องเห็น
-- และพอเปิดเมื่อไหร่ก็ตามทันทุกงวดที่ค้าง
create function materialize_recurring(until date default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target date := coalesce(until, (now() at time zone 'Asia/Bangkok')::date);
  r record;
  d date;
  made int := 0;
  guard int;
begin
  if me is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  for r in
    select * from public.recurring_rules
    where user_id = me and not is_paused and starts_on <= target
  loop
    d := r.starts_on;
    guard := 0;

    while d <= target and (r.ends_on is null or d <= r.ends_on) loop
      -- เพดานกันลูปหนี ถ้ามีกฎ daily ที่ starts_on ย้อนไปหลายปี
      guard := guard + 1;
      exit when guard > 2000;

      -- ต้องใส่ predicate เดียวกับ index ด้วย เพราะ transactions_recurring_once_idx
      -- เป็น partial index — ถ้าระบุแค่คอลัมน์ Postgres หา index ไม่เจอแล้วโยน
      -- 42P10 ทิ้ง (ไม่ใช่ทำงานเงียบ ๆ ผิด ๆ)
      insert into public.transactions
        (user_id, category_id, kind, account_id, amount, occurred_on, note,
         recurring_rule_id, recurring_occurred_on)
      values
        (me, r.category_id, r.kind, r.account_id, r.amount, d, r.note, r.id, d)
      on conflict (recurring_rule_id, recurring_occurred_on)
        where recurring_rule_id is not null
      do nothing;

      if found then
        made := made + 1;
      end if;

      d := case r.freq
        when 'daily' then d + (r.every || ' days')::interval
        when 'weekly' then d + (r.every || ' weeks')::interval
        when 'monthly' then d + (r.every || ' months')::interval
        when 'yearly' then d + (r.every || ' years')::interval
      end::date;
    end loop;

    update public.recurring_rules set last_run_on = target where id = r.id;
  end loop;

  return made;
end;
$$;

revoke all on function materialize_recurring(date) from public, anon;
grant execute on function materialize_recurring(date) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- เป้าหมายการออม (spec 2.3)
-- ────────────────────────────────────────────────────────────────
create table saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  target_date date,
  created_at timestamptz not null default now(),
  achieved_at timestamptz,
  unique (user_id, name)
);

alter table saving_goals enable row level security;

create policy "saving_goals: เจ้าของเท่านั้น" on saving_goals
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on saving_goals to authenticated, service_role;

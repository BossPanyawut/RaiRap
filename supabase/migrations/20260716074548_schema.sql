-- RaiRap schema — ดู docs/development-plan.md §2
-- เงินเป็น numeric(12,2) ไม่ใช่ float. วันที่เป็น date ไม่ใช่ timestamptz
-- (ผู้ใช้คิดเป็นวัน ไม่ใช่นาที และตัดปัญหา timezone shift ทิ้ง)

create type category_kind as enum ('income', 'expense');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'THB',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind category_kind not null,
  color text,
  icon text,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name, kind),
  -- ให้ตารางอื่นอ้าง (id, kind) เป็น composite FK ได้
  unique (id, kind)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  -- denormalize kind กันเคสหมวดถูก archive แล้วรายการเก่ายังต้องรู้ว่าเป็นรับหรือจ่าย
  kind category_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- composite FK บังคับให้ kind ที่ denormalize ไว้ตรงกับหมวดจริงเสมอ
  -- ไม่ต้องใช้ trigger และหลุดไม่ได้
  foreign key (category_id, kind) references categories (id, kind) on delete restrict
);

create index transactions_user_date_idx on transactions (user_id, occurred_on desc);

create index transactions_user_cat_date_idx on transactions (
  user_id, category_id, occurred_on
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  -- งบมีไว้คุมรายจ่าย ไม่มีใครตั้งงบให้รายรับ — composite FK ข้างล่างบังคับให้
  -- อ้างได้เฉพาะหมวดที่เป็น expense
  kind category_kind not null default 'expense' check (kind = 'expense'),
  period_month date not null check (extract(day from period_month) = 1),
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, period_month),
  foreign key (category_id, kind) references categories (id, kind) on delete cascade
);

create function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_set_updated_at
before update on transactions
for each row execute function set_updated_at();

-- สร้าง profile + หมวดเริ่มต้นให้ผู้ใช้ใหม่
-- security definer + search_path = '' ตามคำแนะนำ hardening ของ Supabase
-- (กัน search_path attack) จึงต้องเขียนชื่อตารางแบบเต็มทุกตัว
create function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');

  insert into public.categories (user_id, name, kind, sort_order) values
    (new.id, 'อาหาร', 'expense', 1),
    (new.id, 'เดินทาง', 'expense', 2),
    (new.id, 'ที่พัก', 'expense', 3),
    (new.id, 'บันเทิง', 'expense', 4),
    (new.id, 'ช้อปปิ้ง', 'expense', 5),
    (new.id, 'สุขภาพ', 'expense', 6),
    (new.id, 'อื่น ๆ', 'expense', 99),
    (new.id, 'เงินเดือน', 'income', 1),
    (new.id, 'รายได้เสริม', 'income', 2),
    (new.id, 'อื่น ๆ', 'income', 99);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

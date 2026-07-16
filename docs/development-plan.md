# RaiRap — แผนพัฒนา

แผนนี้อ้างอิง `design-spec-expense-tracker.md` (Liquid Glass, โทนขาว-ฟ้า)

## 1. Stack

| ส่วน | เลือก | เวอร์ชัน (ณ 2026-07-16) |
|---|---|---|
| Framework | Next.js App Router | 16.2.10 |
| UI runtime | React | 19.2.7 |
| Styling | Tailwind CSS v4 (`@theme` + CSS vars) | 4.3.2 |
| DB + Auth | Supabase (Postgres + Auth + RLS) | supabase-js 2.110.6 / @supabase/ssr 0.12.3 |
| Charts | Recharts | 3.9.2 |
| Runtime | Node | 22.15.0 |
| Deploy | Vercel + Supabase cloud | — |

**เหตุผลหลัก:** spec 2.1 บังคับ auth + แยกข้อมูลตามผู้ใช้ → Supabase RLS บังคับที่ชั้น DB ทำให้ไม่ต้องเขียน authorization ซ้ำทุก query. งบ/พยากรณ์ (2.2, 2.3) เป็นการ aggregate → คำนวณใน Postgres view แล้วส่งผลลัพธ์สำเร็จรูปให้ client

**เสริม:** `zod` (validate form + parse env), `date-fns` + `date-fns-tz` (คุม Asia/Bangkok), `react-hook-form`, `supabase` CLI (migration แบบ versioned)

## 2. Data Model

ทุกตารางมี `user_id uuid not null references auth.users(id) on delete cascade` + RLS policy `auth.uid() = user_id`

```sql
-- profiles: 1:1 กับ auth.users, สร้างด้วย trigger on auth.users insert
profiles(id uuid pk → auth.users, display_name text, currency text default 'THB', created_at timestamptz)

-- categories: หมวดหมู่กำหนดเองได้ (spec 2.1)
categories(id uuid pk, user_id, name text, kind category_kind, -- enum: income | expense
           color text, icon text, sort_order int, is_archived bool default false,
           unique(user_id, name, kind))

-- transactions: แกนกลาง
transactions(id uuid pk, user_id, category_id → categories,
             kind category_kind,              -- denormalize กันเคส category ถูก archive
             amount numeric(12,2) check (amount > 0),
             occurred_on date not null,       -- date ไม่ใช่ timestamptz: ผู้ใช้คิดเป็นวัน ไม่ใช่นาที
             note text, created_at, updated_at)
  index (user_id, occurred_on desc)
  index (user_id, category_id, occurred_on)

-- budgets: วงเงินต่อหมวดต่อเดือน (spec 2.2)
budgets(id uuid pk, user_id, category_id → categories,
        period_month date,                    -- normalize เป็นวันที่ 1 ของเดือนเสมอ
        amount numeric(12,2) check (amount >= 0),
        unique(user_id, category_id, period_month))
```

**ข้อควรระวัง — เงิน:** ใช้ `numeric(12,2)` ไม่ใช่ `float`/`double`. ห้ามบวกลบเงินด้วย float ฝั่ง JS ในจุดที่ผลลัพธ์ถูกเซฟกลับ — ให้ Postgres รวมยอดแทน

**ข้อควรระวัง — timezone:** ขอบเขต "เดือนนี้" ต้องคิดที่ Asia/Bangkok. `occurred_on` เป็น `date` จึงไม่มีปัญหา TZ shift แต่ฝั่ง client ที่หา "เดือนปัจจุบัน" ต้องใช้ `date-fns-tz` ไม่ใช่ `new Date()` ตรง ๆ (เครื่อง user อาจตั้ง TZ อื่น)

### Views (คำนวณใน DB)

```sql
-- ยอดรวมรายเดือน: รายรับ, รายจ่าย, net
v_monthly_summary(user_id, period_month, income, expense, net)

-- ยอดคงเหลือสะสมยกยอด (spec 2.3) — window function
v_running_balance(user_id, period_month, net, balance)
  -- balance = sum(net) over (partition by user_id order by period_month)

-- งบ vs ใช้จริง + % (spec 2.2)
v_budget_usage(user_id, period_month, category_id, budget_amount, spent, pct, status)
  -- status: 'ok' (<80) | 'warn' (80–100) | 'over' (>100)
```

view ทั้งหมดต้องเป็น `security_invoker = true` ไม่งั้น RLS จะไม่ทำงานผ่าน view

## 3. Structure

```
app/
  (auth)/login, /signup, /auth/callback     — route handler แลก code → session
  (app)/layout.tsx                          — nav กระจก + guard
  (app)/page.tsx                            — Dashboard (hero, budget cards, chart)
  (app)/transactions/                       — list + filter + form
  (app)/budgets/                            — ตั้งงบต่อหมวด/เดือน
  (app)/categories/
  (app)/analytics/
  globals.css                               — @theme tokens + glass utilities
components/
  ui/          — GlassCard, Button, ProgressBar, EmptyState, Field
  charts/      — CategoryPie, BalanceTrend, IncomeExpenseBar
  hero/        — HeroBalanceCard (Liquid Light Sweep)
lib/
  supabase/    — client.ts, server.ts, middleware.ts (@supabase/ssr)
  money.ts     — format ฿, parse input
  dates.ts     — period helpers (Asia/Bangkok)
  schemas.ts   — zod
supabase/migrations/*.sql
middleware.ts  — refresh session cookie + redirect unauth
```

## 4. Design system → code

> รายละเอียดเต็ม + เหตุผลของทุกการตัดสินอยู่ใน **[`design-direction.md`](./design-direction.md)** — ส่วนนี้เป็นแค่หน้าสรุปสำหรับตอนเขียนโค้ด

Tailwind v4 `@theme` แปลง token จาก spec §3 เป็น CSS var ตรง ๆ:

```css
@theme {
  --color-accent-primary: #2E7FE0;
  --color-accent-deep:    #144C8C;
  --color-accent-mint:    #8FDDD4;
  --color-accent-warn:    #F5A97F;
  --color-text-primary:   #1B2A3D;
  --color-text-muted:     #4F6379;  /* ← ค่าเดียวที่ต่างจาก spec §3 (เดิม #5C7086) */

  --font-money: var(--font-space-grotesk);  /* ตัวเลข + Latin เท่านั้น */
  --font-sans:  var(--font-plex-thai);      /* ข้อความไทยทั้งหมด รวมหัวข้อ */
  --font-mono:  var(--font-plex-mono);      /* ยอดเงินในตาราง */
}
```

**`--text-muted` เข้มขึ้น** เพราะ `#5C7086` บน `--bg-gradient-bottom` ได้ 4.13:1 → ตก WCAG AA ที่ spec §8 สั่งไว้เอง. `#4F6379` ได้ 5.00–5.64:1 ทุกพื้น

**กฎฟอนต์ — Space Grotesk ไม่มี glyph ไทย** (ยืนยันจาก Google Fonts metadata) จึงเป็น "ฟอนต์หัวข้อ" ตาม spec §4 ไม่ได้:

| Role | Family | หมายเหตุ |
|---|---|---|
| Hero money | Space Grotesk 600 | `tabular-nums` 40–56px — ห้ามมีไทยปน |
| Heading ไทย | IBM Plex Sans Thai 600 | 20–28px (spec §4 สั่ง Grotesk — ทำไม่ได้) |
| Body | IBM Plex Sans Thai 400 | 15–16px **`line-height: 1.65`** |
| Money ในตาราง | IBM Plex Mono 400 | `tabular-nums` |

- โหลดผ่าน `next/font/google` → self-host อัตโนมัติ ไม่มี FOUT ไม่ยิง Google ตอน runtime
- **`<html lang="th">` เป็นของจำเป็น** — ไทยไม่เว้นวรรคระหว่างคำ ถ้าไม่ตั้ง เบราว์เซอร์ไม่ใช้ dictionary line-breaking → บรรทัดตัดกลางคำ
- **ห้าม `letter-spacing` กับข้อความไทย** — ถ่างตัวอักษรจะแยกสระออกจากพยัญชนะ. ใช้กับ Latin/ตัวเลขได้
- Glass: `.glass { background: rgba(255,255,255,.55); backdrop-filter: blur(20px) saturate(160%); border: 1px solid rgba(255,255,255,.8); border-radius: 24px }` — ห้าม nested
- Liquid Light Sweep: hero card ใบเดียว (spec §6) — **animate `transform` เท่านั้น ห้าม `background-position`** ไม่งั้นบังคับคำนวณ blur ใหม่ทุกเฟรม. CSS ตัวเต็มอยู่ใน `design-direction.md` §D

## 5. Phases

### Phase 0 — Scaffold (0.5 วัน)
1. `npx create-next-app@latest . --ts --app --tailwind --eslint`
2. ติดตั้ง deps, ตั้ง `.env.example`, zod-parse env
3. `globals.css`: gradient background, `@theme` tokens, glass utility
4. `next/font` 3 ตัว + `<html lang="th">` + กฎฟอนต์ตาม §4 (Grotesk = เงินเท่านั้น)
5. คอมโพเนนต์ฐาน: GlassCard, Button (primary/secondary), ProgressBar
6. **Gate:** หน้า static ที่มี GlassCard 3 ใบบน gradient หน้าตาตรง spec §5. ตรวจ 3 อย่าง: หัวข้อไทยผสม Latin ("งบเดือน July") ต้องเป็นฟอนต์เดียวไร้รอยต่อ / วรรณยุกต์ซ้อนสองชั้น ("ปั๊ม", "ที่") ไม่ชนบรรทัดบน / ย่อหน้าไทยยาว ๆ ตัดบรรทัดตรงช่องว่างคำ ไม่ตัดกลางคำ

### Phase 1 — Supabase + Auth (1 วัน)
1. สร้าง project, `supabase init` + `supabase link`
2. Migration 001: enum, ตาราง, index, trigger `handle_new_user` (seed หมวดหมู่เริ่มต้น: อาหาร/เดินทาง/ที่พัก/บันเทิง/บันเทิง/เงินเดือน)
3. Migration 002: RLS enable + policy select/insert/update/delete ทุกตาราง
4. `lib/supabase/{client,server}.ts` ด้วย `@supabase/ssr` (cookie-based session)
5. `middleware.ts` refresh session + redirect
6. หน้า login/signup (email+password) + `/auth/callback`
7. **Gate:** 2 บัญชีเห็นข้อมูลกันไม่ได้ — ทดสอบยิง query ข้าม user_id ต้องได้ 0 แถว ไม่ใช่แค่ UI ซ่อน

### Phase 2 — Core CRUD (2 วัน) — spec 2.1
1. Categories: list/create/edit/archive (soft delete — ห้าม hard delete เพราะ transaction อ้างอยู่)
2. Transaction form: จำนวนเงิน, วันที่, หมวดหมู่, kind, บันทึกย่อ — validate ด้วย zod ทั้งฝั่ง client และ Server Action
3. Transaction list: infinite scroll/pagination + filter (ช่วงวันที่, หมวดหมู่, ช่วงจำนวนเงิน — spec 2.5)
4. Edit/delete ย้อนหลัง + optimistic update
5. `v_monthly_summary` + Hero card แสดงยอดคงเหลือเดือนนี้
6. **Gate:** บันทึก 20 รายการ → ยอด hero ตรงกับผลรวมมือ

### Phase 3 — Budget (1.5 วัน) — spec 2.2
1. หน้า budgets: ตั้งวงเงินต่อหมวด/เดือน + ปุ่ม "คัดลอกงบเดือนก่อน"
2. `v_budget_usage` → dashboard แสดง **เฉพาะหมวด `status IN ('warn','over')` (≥80%)** ไม่ใช่ทุกหมวด — ตาม spec §1 "ล้อมรอบด้วยการ์ดกระจกเล็กที่แสดงหมวดหมู่ที่ใช้เกิน". งบครบทุกหมวดอยู่ที่ `/budgets`
3. ProgressBar 3 สถานะตาม spec §7: mint <80%, warn 80–100%, warn เข้ม + **ไอคอน + ข้อความ** >100% (ห้ามสื่อด้วยสีอย่างเดียว — ตาบอดสีต้องอ่านออก)
4. แจ้งเตือนในแอปตอนข้าม 80% / 100%
5. เคสไม่มีหมวดไหนเกิน 80% = ข่าวดี ไม่ใช่ empty state — การ์ดใบเดียว น้ำเสียงเรียบ "ทุกหมวดยังอยู่ในงบ" + ลิงก์ไป `/budgets`
6. **Gate:** เพิ่มรายจ่ายแล้ว bar ขยับทันที, ที่ 79→80→101% เปลี่ยนสถานะถูก, หมวดที่ 79% ต้อง**ไม่**โผล่บน dashboard

### Phase 4 — Analytics (1.5 วัน) — spec 2.4 + 2.3 (บางส่วน)
0. **โหลด `dataviz` skill ก่อนเขียนโค้ดกราฟบรรทัดแรก**
1. `v_running_balance` → ยกยอดสะสมข้ามเดือน
2. CategoryPie (เดือนปัจจุบัน) — ไล่เฉดสีเดียว `--accent-deep` → `--accent-primary` → tint อ่อน **เรียง slice ตามยอด** (spec §7 ห้ามกราฟหลายสี). interpolate ใน **OKLCH ไม่ใช่ hex lerp** — lerp ใน sRGB ผ่านโซนน้ำเงินจะออกม่วงหม่นกลางทาง
3. BalanceTrend — area chart 6–12 เดือน, `--accent-primary` + gradient fill (spec §7)
4. IncomeExpenseBar — รายรับ `--accent-mint` / รายจ่าย `--accent-primary` (ห้ามแดง §3; รายจ่ายไม่ใช่เรื่องแย่ จึงไม่ควรได้สีเตือน)
5. **Gate:** ยอดในกราฟ = ยอดใน list, เดือนที่ไม่มีข้อมูลไม่ทำกราฟพัง

### Phase 5 — Polish (1 วัน)
1. Responsive: มือถือ 1 คอลัมน์ / เดสก์ท็อป grid (spec 2.5)
2. Empty & error states ตาม spec §9 (ข้อความชวนลงมือ ไม่ตำหนิ)
3. A11y: focus ring `--accent-deep` 2px, keyboard nav, `prefers-reduced-motion`, ตรวจ contrast จริง
4. Loading skeleton แบบกระจก
5. **Gate:** Lighthouse a11y ≥ 95, ไม่มี horizontal scroll ที่ 360px

**รวม MVP ≈ 7.5 วันทำงาน**

## 6. Post-MVP (ตามลำดับคุณค่า)

1. **2.3 ที่เหลือ** — พยากรณ์ปลายเดือน (burn rate), What-if simulator, เป้าหมายการออม, สรุปจบเดือน
2. **2.5** — import/export CSV+Excel, หลายบัญชี/กระเป๋าเงิน, รายการเกิดซ้ำอัตโนมัติ (pg_cron หรือ Vercel cron)
3. **2.6** — Dark mode, แนบรูปใบเสร็จ (Supabase Storage), รายงาน PDF, email แจ้งเตือน

Schema ข้อ 2 เผื่อทางไว้แล้ว: multi-account เพิ่ม `accounts` + `transactions.account_id nullable` ได้โดยไม่ต้องแก้ของเดิม

## 7. ความเสี่ยง

| เรื่อง | ปัญหา | ทางแก้ |
|---|---|---|
| `backdrop-filter: blur(20px)` | การ์ดกระจกหลายใบพร้อมกันทำ scroll กระตุกบนมือถือ/Safari | จำกัดชั้น blur, ห้าม blur ซ้อน blur, `will-change` เท่าที่จำเป็น, มี fallback ทึบเมื่อ `@supports not (backdrop-filter: blur(1px))` |
| Contrast `--text-muted` | `#5C7086` บน `#EAF4FC` = **4.58:1** ผ่าน AA แบบเฉียดฉิว — บนพื้น gradient ล่าง/การ์ดโปร่งอาจตกกรอบ | วัดจริงทุกจุดใน Phase 5, ถ้าตกให้ขยับ muted เข้มขึ้น |
| `--accent-warn` `#F5A97F` | contrast ต่ำมาก ใช้เป็นสีตัวอักษรไม่ได้ | ใช้เป็นสีแท่ง/พื้นเท่านั้น ข้อความเตือนใช้ `--text-primary` |
| "ห้ามใช้สีแดง" (spec §3) | สื่อ over-budget ด้วยสีอย่างเดียว = ตาบอดสีอ่านไม่ออก | บังคับ ไอคอน + ข้อความ คู่กับสีเสมอ (spec §7 ระบุไว้แล้ว) |
| Timezone | `new Date()` ฝั่ง client ใช้ TZ เครื่อง → ขอบเดือนเพี้ยน | `date-fns-tz` ตรึง Asia/Bangkok ทุกจุดที่หา period |
| Numeric ผ่าน PostgREST | `numeric` ส่งกลับเป็น JSON number | `numeric(12,2)` ปลอดภัยในช่วง double; ห้ามใช้ float คำนวณแล้วเซฟกลับ |
| RLS ผ่าน view | view default เป็น security definer → RLS ถูกข้าม | `security_invoker = true` ทุก view + ทดสอบข้าม user ใน Phase 1 gate |

## 8. ปัญหาสภาพแวดล้อม (เจอตอน Phase 0)

`~/.zshrc` บรรทัด 2 มีสองคำสั่งติดกันโดยไม่มีตัวคั่น:

```sh
export PATH="/usr/local/bin:$PATH"export NODE_ENV=development
```

zsh อ่าน `"/usr/local/bin:$PATH"export` เป็น **คำเดียว** แล้ว `export` ได้ arg สองตัว ผลคือ:

1. **`NODE_ENV=development` ถูก export ทั้งเครื่อง** → `next build` ล้มด้วย
   `TypeError: Cannot read properties of null (reading 'useContext')` ตอน prerender
   `/_global-error`. กระทบทุก production build บนเครื่องนี้ ไม่ใช่แค่ repo นี้
2. **`/usr/local/bin` ไม่เคยเข้า PATH** — เข้าไปเป็น `/usr/local/binexport` (ซ้ำ 2 ครั้ง)
   ของที่ติดตั้งไว้ใน `/usr/local/bin` เรียกใช้ผ่าน PATH ไม่ได้

**แก้:** แยกเป็นสองบรรทัด

```sh
export PATH="/usr/local/bin:$PATH"
export NODE_ENV=development   # ← พิจารณาลบทิ้ง ไม่ควรตั้งค่านี้ทั้งเครื่อง
```

`NODE_ENV` ควรให้เครื่องมือตั้งเอง (`next dev` ตั้ง development, `next build` ตั้ง production)
การ pin ไว้ทั้งเครื่องคือสาเหตุของข้อ 1

ชั่วคราวระหว่างยังไม่แก้: `NODE_ENV=production npm run build`

## 8.5 สิ่งที่เจอตอน Phase 1–5 (ของจริง ไม่ใช่ทฤษฎี)

รันซ้ำได้ด้วย `npm run gate` (58 ข้อ) — ต้องมี local Supabase (`npx supabase start`) และ `npm run dev` ก่อน

**ความปลอดภัย — เจอเพราะ gate จับ ไม่ใช่เพราะเดา:**

1. **RLS policy ไม่ได้ "ให้สิทธิ์" มันแค่ "กรอง"** — policy ครบแต่ไม่มี `GRANT` ระดับตาราง
   แอปได้ `42501 permission denied` ทั้งหมด ต้องมีทั้งสองชั้น
2. **`anon` และ `authenticated` ติด `TRUNCATE` มาจาก default privileges ของ Supabase**
   และ **RLS ไม่บังคับกับ TRUNCATE เลย** — ผู้ใช้ที่ล็อกอินคนไหนก็ได้ ถ้าเรียกถึง
   จะล้างข้อมูลของทุกคนในคำสั่งเดียว ทั้งที่ policy แน่นหมด PostgREST ไม่เปิด TRUNCATE
   ผ่าน REST จึงยังเอื้อมไม่ถึง แต่ปิดทิ้งแล้วใน migration 003 — ให้เท่าที่ใช้จริง 4 คำสั่ง
3. **`security_invoker = true` ทุก view** — ทดสอบแล้วว่า Bob select `v_monthly_summary`
   ได้ 0 แถว ถ้าลืม flag นี้ view จะเป็นประตูหลังข้าม RLS ทั้งหมด

**Next 16:**

4. **Middleware เปลี่ยนชื่อเป็น Proxy** — ไฟล์ต้องเป็น `proxy.ts` export ชื่อ `proxy`
   tutorial ของ Supabase ทุกอันยังเขียน `middleware.ts` ซึ่งใช้กับ Next 16 ไม่ได้
   เอกสาร Next เตือนเองด้วยว่า proxy ไม่ใช่ที่สำหรับ authorization — ตัวจริงคือ RLS

**ความถูกต้องของตัวเลข:**

5. **การปัด pct ต้องเกิดก่อนเทียบขอบเขต ไม่ใช่หลัง** — ที่ 79.96% Postgres ปัดเป็น
   80.0 แล้วบอก `warn` (การ์ดโผล่บน dashboard) แต่ถ้า client เทียบ 79.96 ตรง ๆ จะได้
   `ok` แล้ววาดแท่งเขียว ทั้งที่จอเขียน "80%" — สองความจริงบนการ์ดใบเดียว
   `budgetPct()` จึงปัดแบบเดียวกับ `round(…, 1)` ของ view และ gate ยิงเทียบทุกค่าขอบ
6. **ห้ามปัดเงินทีละแถวในตารางแจกแจง** — ตารางกราฟเคยปัดเป็นจำนวนเต็ม 5 แถว
   เพี้ยนสะสม 1.45 บาท ผู้ใช้บวกเองแล้วไม่ตรงยอดรวม (hero ปัดได้ เพราะเป็นพาดหัว)

**เข้าถึงได้ (axe-core บนหน้าจริงทั้ง 5 หน้า):**

7. **ขาวบน `--accent-primary` #2E7FE0 = 4.02:1 ตก AA** — spec §7 สั่งให้ปุ่มหลักใช้สีนี้
   กับตัวอักษรขาว แต่ §8 สั่ง WCAG AA ทำพร้อมกันไม่ได้ เพิ่ม
   `--accent-primary-strong #2974cf` (= accent-primary ผสม accent-deep 20% → 4.67:1)
   ใช้เฉพาะพื้นทึบที่แบกตัวอักษรขาว ส่วน `--accent-primary` เดิมยังใช้กับเส้นกราฟ/ลิงก์
8. **เมนู 5 อันไม่พอดี 360px** — ทำให้ทั้งหน้าเลื่อนแนวนอน แก้ด้วยให้แถบเมนูเลื่อน
   ในตัวเอง

**กราฟ (จากสกิล `dataviz`):**

9. **pie คือ anti-pattern ที่สกิลระบุตรง ๆ** สำหรับค่าใกล้กัน + ชื่อยาว — spec §2.4
   สั่ง pie ไว้ brief จึงชนะ แต่บังคับขอบ ≤6 ชิ้น (top 5 + "อื่น ๆ")
10. **ramp สีเดียวบนพื้นกระจกเกือบขาวไม่มีที่ยืน** — วัดแล้ว 3 ขั้นอ่อนต่ำกว่า 3:1
    รัดยังไงก็ไม่ผ่าน (สุดทางได้ 2.67:1) ชดเชยตามที่สกิลกำหนด: เว้นช่อง 2px สีพื้น
    ระหว่าง slice + ตารางจัดอันดับข้าง ๆ ตัวตนมาจากข้อความ ไม่ใช่สี
11. **สกิลยืนยันเหตุผลใน design-direction §B เอง** — "ถ้าสลับลำดับแล้วความหมายเปลี่ยน
    = ordinal ใช้ ramp สีเดียว" slice เรียงตามยอด จึงเป็น ordinal ไม่ใช่ categorical

## 9. สิ่งที่ยืนยันด้วยของจริงใน Phase 0

- **`--text-muted` ต้องเข้มขึ้นจริง** — วัด contrast จาก pixel ที่ render จริง สี `#5C7086` ของ
  spec ได้ **4.34:1 = ตก AA** ที่ย่อหน้าสรุปซึ่งนั่งบน gradient ตรง ๆ. `#4F6379` ได้ 5.27:1
  (แย่สุดในหน้า) ผ่านทุกจุด
- **กระจกเป็น no-op ถ้าพื้นหลังเป็น gradient เรียบ** — blur ของ linear gradient คืนค่า gradient
  เดิมแทบเป๊ะ `backdrop-filter: blur(20px)` เลยไม่เห็นผลอะไร การ์ดออกมาเป็นสี่เหลี่ยมขาวแบน
  ต้องมีก้อนสีความถี่ต่ำ (radial-gradient จาก accent token) ให้ blur ป้าย = "อะไรให้สะท้อน"
  ที่ spec §5 เรียกหา
- **`formatBaht` ต้องใช้ U+00A0** — space ธรรมดาทำให้บรรทัดตัดคั่น `฿` ออกจากตัวเลขได้จริง
  (เจอตอน render จริง)
- **dictionary line-breaking ของไทยทำงาน** — `lang="th"` ทำให้เบราว์เซอร์ตัด "ปัญญาวุฒิ"
  ที่รอยต่อ `ปัญญา|วุฒิ` ซึ่งถูกหลักภาษา (แต่ชื่อคนไม่ควรตัด → ใส่ `whitespace-nowrap`)

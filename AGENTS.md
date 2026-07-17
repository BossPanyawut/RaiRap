<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RaiRap

เว็บแอปบันทึกรายรับ-รายจ่ายภาษาไทย · Next.js 16 · Supabase · Tailwind v4 · Recharts

## ลำดับความสำคัญของเอกสาร

1. **`docs/design-spec-expense-tracker.md`** — brief ตัวจริง **ชนะเสมอ** เมื่อขัดกับที่อื่น
   ยกเว้นจุดที่ brief ขัดกันเอง (มี 3 จุด ดู §B ของ design-direction)
2. **`docs/design-direction.md`** — การตัดสินใจด้านดีไซน์ + เหตุผล
3. **`docs/development-plan.md`** — stack, data model, ความเสี่ยง, สิ่งที่วัดแล้วเจอ

อย่าตัดสินใจใหม่ทับของที่ตัดสินไปแล้วโดยไม่อ่านเหตุผลก่อน หลายอันมีตัวเลขวัดจริงรองรับ

## ก่อนเริ่ม

```bash
npx supabase start     # ต้องมี Docker รัน
npm run db:reset
npm run dev
npm run seed:demo      # demo@rairap.dev / demo1234
```

ถ้า `npm run build` ล้มด้วย `TypeError: Cannot read properties of null (reading 'useContext')`
แปลว่ามี `NODE_ENV` ตั้งค้างใน environment (`echo $NODE_ENV`) — `next build` ต้องตั้งเอง
ชั่วคราวใช้ `NODE_ENV=production npm run build`

## กฎที่ห้ามผิด

ทุกข้อข้างล่างเคยพังจริงและมี gate ดักไว้ ถ้าแก้แล้ว `npm run gate` แดง แปลว่าคุณผิด ไม่ใช่ gate ผิด

### ความปลอดภัย

- **RLS คือชั้น authorization จริง ไม่ใช่ UI** `proxy.ts` แค่รีเฟรช session cookie
  และเด้ง path เพื่อ UX เอกสาร Next เตือนเองว่า proxy ไม่ใช่ที่ทำ authorization
- **RLS policy ไม่ได้ "ให้สิทธิ์" มันแค่ "กรอง"** ต้องมี `GRANT` ระดับตารางด้วย
  ไม่งั้นได้ `42501 permission denied` ทั้งแอป
- **ให้สิทธิ์เท่าที่ใช้จริง** `authenticated` มีแค่ `SELECT/INSERT/UPDATE/DELETE`
  ห้ามคืน `TRUNCATE` — **RLS ไม่บังคับกับ TRUNCATE** ใครที่มีสิทธิ์นี้ล้างข้อมูล
  ของผู้ใช้ทุกคนได้ในคำสั่งเดียว `anon` ไม่ได้อะไรเลย
- **`security_invoker = true` ทุก view** ค่า default ทำให้ view ข้าม RLS ของตารางข้างใต้
- **ฟังก์ชันที่แตะข้อมูลผู้ใช้ห้ามรับ uuid เป็น argument** ให้อ่าน `auth.uid()` เอง
  (`reset_my_categories`, `delete_my_account`) ไม่งั้นยิงใส่บัญชีคนอื่นได้
- **`.env.local` มีแค่ anon key** service_role ห้ามหลุดถึงเบราว์เซอร์
- **`getUser()` ไม่ใช่ `getSession()` ฝั่ง server** getSession อ่าน cookie ดิบโดยไม่ตรวจลายเซ็น

### Next 16

- **Middleware เปลี่ยนชื่อเป็น Proxy** ไฟล์คือ `proxy.ts` export ชื่อ `proxy`
  tutorial ของ Supabase ทุกอันยังเขียน `middleware.ts` ซึ่งใช้ไม่ได้
- อ่าน `node_modules/next/dist/docs/` ก่อนเขียน อย่าเชื่อความจำ

### ตัวเลข

- **เงินเป็น `numeric(12,2)` ห้าม float** รวมยอดใน Postgres ไม่ใช่ JS
- **วันที่เป็น `date` ห้าม `timestamptz`** ผู้ใช้คิดเป็นวัน และตัดปัญหา TZ ทิ้ง
- **ตรึงเวลาไทยทุกที่** `new Date()` ฝั่ง client ใช้ TZ เครื่องผู้ใช้ ขอบเดือนจะเพี้ยน
  ใช้ helper ใน `lib/dates.ts` เท่านั้น
- **`budgetPct()` ต้องปัดแบบเดียวกับ `round(…, 1)` ใน `v_budget_usage`**
  และปัดก่อนเทียบขอบ ไม่ใช่หลัง ที่ 79.96% Postgres บอก `warn` แต่ถ้า client เทียบ
  ค่าดิบจะได้ `ok` แล้ววาดแท่งเขียวทั้งที่จอเขียน "80%"
- **`periodOf()` ใน `lib/dates.ts` ต้องให้ผลตรงกับ `period_of()` ใน Postgres เป๊ะ**
- **ตารางแจกแจงห้ามปัดเงินทีละแถว** ผู้ใช้บวกเองแล้วต้องตรงยอดรวม (hero ปัดได้ เป็นพาดหัว)
- **`formatMoney` ใช้ U+00A0 หลังสัญลักษณ์** space ธรรมดาทำให้บรรทัดตัดคั่น `฿` ออกจากตัวเลข

### รอบเดือน

- period ระบุด้วย **"เดือนที่รอบเริ่ม"** ไม่ใช่ช่วงวันที่
- `period_of(d, 1)` เท่ากับ `date_trunc('month', d)` เป๊ะ — ห้ามทำอะไรที่ทำให้เสียคุณสมบัตินี้
  เพราะมันคือเหตุผลที่ `budgets.period_month` และข้อมูลเดิมไม่ต้อง migrate
- `cycle_start_day` จำกัด 1–28 ทุกเดือนมีวันที่ 28 เสมอ

### สกุลเงิน

- **ส่งเป็น prop เท่านั้น ห้ามเก็บระดับโมดูล** server component แชร์โมดูลข้ามคำขอ
  ค่าของผู้ใช้คนหนึ่งจะรั่วไปหาอีกคน — `getSettings()` ใน `lib/profile.ts` ห่อด้วย `cache()` แล้ว
- หนึ่งบัญชีหนึ่งสกุล ไม่มีการแปลงค่า JPY ไม่มีทศนิยม

### ภาษาไทย

- **`<html lang="th">` เป็นของจำเป็น** ไม่มีแล้วเบราว์เซอร์ตัดบรรทัดกลางคำ
- **`line-height: 1.65` ขั้นต่ำ** ไทยซ้อนสระ + วรรณยุกต์สองชั้น
- **ห้าม `letter-spacing` กับข้อความไทย** จะแยกสระออกจากพยัญชนะ
- **Space Grotesk ไม่มี glyph ไทย** ใช้กับตัวเลขเงิน + Latin เท่านั้น หัวข้อไทยใช้ IBM Plex Sans Thai
- ชื่อคนใส่ `whitespace-nowrap` ไม่งั้นถูกตัดกลางชื่อ

### สี / ธีม

- **ห้าม hardcode `bg-white/60` หรือ `text-accent-deep`** ใช้ token เชิงความหมาย:
  `bg-input` `bg-hover` `text-link` `--color-focus-ring` — ค่า hardcode กลายเป็น
  แผ่นเทาบนพื้นมืด (วัดได้ 1.39:1)
- **`dark:` ผูกกับ `data-theme` ผ่าน `@custom-variant`** ไม่ใช่ `prefers-color-scheme`
  ถ้าลบบรรทัดนั้น `dark:*` ทุกตัวกลายเป็นโค้ดตายเงียบ ๆ
- **dark ไม่ใช่การกลับสีของ light** ทุกค่าเลือกเองแล้ววัดใหม่ ramp กราฟกลับทิศเป็นอ่อน→เข้ม
  (ชุดของ light บนพื้นมืดจม 3 ขั้น: 1.57 / 2.14 / 2.89)
- **3 token ต่างจาก spec §3 เพราะ spec §8 สั่ง WCAG AA แล้วค่าเดิมทำไม่ได้**
  `--text-muted #4F6379` (เดิม 4.34:1) · `--accent-primary-strong #2974cf` สำหรับพื้นทึบ
  ที่แบกตัวอักษรขาว (ขาวบน `--accent-primary` = 4.02:1) · dark มีชุดของตัวเอง
- **ห้ามใช้สีแดง** (spec §3) สถานะเกินงบสื่อด้วย **ไอคอน + ข้อความ** เสมอ ไม่ใช่สีอย่างเดียว
- **กระจกเป็น no-op ถ้าพื้นหลังเรียบ** blur ของ linear gradient คืนค่า gradient เดิม
  ก้อนสี radial ใน `body::before` คือสิ่งที่ทำให้ `backdrop-filter` เห็นผล ห้ามลบ
- **sweep animate `transform` เท่านั้น** วัดแล้ว: transform = Paint 4 ครั้ง/รอบ, background-position = 1,562 (390 เท่า)

### กราฟ

- **โหลดสกิล `dataviz` ก่อนเขียนโค้ดกราฟบรรทัดแรก**
- ramp เป็น **ordinal** (slice เรียงตามยอด) จึงใช้สีเดียวไล่เฉด ไม่ใช่ categorical
- ขั้นปลาย ramp ต่ำกว่า 3:1 ทั้งสองโหมด และรัดยังไงก็ไม่ผ่าน จึงชดเชยด้วย
  **ช่องว่าง 2px สีพื้นระหว่าง slice + ตารางจัดอันดับ** ห้ามตัดข้อใดข้อหนึ่งทิ้ง
- pie จำกัด ≤6 ชิ้น (top 5 + "อื่น ๆ") ตามขอบที่สกิลกำหนด
- สีกราฟทั้งหมดเป็น CSS var ไม่ใช่ hex — dark สลับที่ชั้น CSS

### ข้อความ

- **คำกริยาเดียวตลอด flow** ปุ่ม "บันทึก" → toast "บันทึกแล้ว"
- **error ไม่ขอโทษ ไม่กำกวม** บอกว่าเกิดอะไร + แก้ยังไง
- **หน้าจอว่างคือคำเชิญให้ลงมือ** ไม่ใช่ที่บอกว่าไม่มีอะไร
- ตัดคำเติม ("กันเลย", "นะคะ")

## Gate

```bash
npm run gate        # 134 ข้อ — ต้องมี supabase + dev server รันอยู่
```

| คำสั่ง | ครอบอะไร |
|---|---|
| `gate:rls` | ยิง query/insert/update/delete ข้าม user ด้วย JWT จริง · view ไม่เป็นประตูหลัง · anon เข้าไม่ถึง |
| `gate:settings` | รอบเดือนเทียบกับ Postgres · constraint · RLS ของ dismissed_alerts · ล้างข้อมูลข้าม user · CSV ไป-กลับ · ลบบัญชี |
| `gate:extras` | รายการเกิดซ้ำ idempotent + เลขงวด · ยอดแยกบัญชี · storage ข้าม user (อัป/โหลด/list/ลบ) |
| `gate:e2e` | ยอดเงินตรงผลรวมมือ · ขอบ 79/80/101% · JS ↔ Postgres ไม่ drift · กราฟ |
| `gate:a11y` | axe-core ทั้ง light/dark ทุกหน้า · 360px · focus ring · reduced-motion |

**gate script ลบข้อมูลด้วย service_role** `scripts/local-only.mjs` บังคับให้ชี้ localhost เท่านั้น
ห้ามถอดการ์ดนี้

เขียน gate ก่อนเชื่อว่าโค้ดใช้ได้ ถ้า gate ตกให้ดูก่อนว่า assertion ถูกไหม — เคยมีหลายครั้งที่
โค้ดถูกแต่ test ผิด

## โครงสร้าง

```
app/(auth)/          login, signup, actions
app/(app)/           หน้าที่ต้องล็อกอิน — layout.tsx เป็นด่านสุดท้ายหลัง proxy
  settings/          actions.ts · import-actions.ts · export/route.ts
lib/
  supabase/          client (browser) · server (RSC/action)
  profile.ts         getSettings() — cache() ต่อคำขอ
  alerts.ts          คำนวณสดจาก view ไม่เก็บเป็นแถว
  money.ts dates.ts csv.ts chart-palette.ts theme.ts
proxy.ts             session refresh + redirect (ไม่ใช่ authorization)
supabase/migrations/ เรียงตามเวลา อย่าแก้ไฟล์เก่า ให้เพิ่มไฟล์ใหม่
scripts/             gate + seed
```

หลังแก้ schema: `npm run db:reset && npm run db:types`

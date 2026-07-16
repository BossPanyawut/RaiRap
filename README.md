# RaiRap

เว็บแอปบันทึกรายรับ-รายจ่าย โทนขาว-ฟ้า แนวคิด "Liquid Glass"

## เอกสาร

| ไฟล์ | เนื้อหา |
|---|---|
| [`docs/design-spec-expense-tracker.md`](docs/design-spec-expense-tracker.md) | brief ตัวจริง — ชนะเสมอเมื่อขัดกับที่อื่น |
| [`docs/design-direction.md`](docs/design-direction.md) | การตัดสินใจด้านดีไซน์ + จุดที่ brief ขัดกันเอง |
| [`docs/development-plan.md`](docs/development-plan.md) | stack, data model, phase, ความเสี่ยง, สิ่งที่เจอจริง |

## เริ่มใช้งาน

ต้องมี Docker รันอยู่ (Supabase local ใช้)

```bash
npm install
npx supabase start          # ขึ้น Postgres + Auth + PostgREST ในเครื่อง
npm run db:reset            # สร้าง schema + RLS + views
cp .env.example .env.local  # ใส่ค่าจาก `npx supabase status`
npm run dev
```

ต่อ Supabase cloud แทน local: เปลี่ยนค่าใน `.env.local` เป็น URL + anon key ของ project
แล้ว `npx supabase link` + `npx supabase db push`

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (ดู "หมายเหตุเครื่องนี้") |
| `npm run db:reset` | ล้าง DB แล้วรัน migration ใหม่ทั้งหมด |
| `npm run db:types` | gen `lib/database.types.ts` จาก schema จริง |
| `npm run gate` | รัน gate ทั้งหมด 58 ข้อ (ต้องมี dev server + supabase รันอยู่) |
| `npm run gate:rls` | เฉพาะ RLS — ยิง query ข้าม user ต้องได้ 0 แถว |
| `npm run gate:e2e` | เฉพาะ e2e — ยอดเงิน, ขอบเขตงบ, กราฟ |
| `npm run gate:a11y` | เฉพาะ a11y — axe-core + 360px + focus + reduced-motion |

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS) · Recharts

## หลักที่ยึด

- **RLS คือชั้น authorization จริง ไม่ใช่ UI** — `proxy.ts` แค่รีเฟรช session cookie
  และเด้ง path เพื่อ UX เท่านั้น `gate:rls` ยิง query ข้าม user จริงเพื่อพิสูจน์
- **เงินเป็น `numeric(12,2)` ไม่ใช่ float** — รวมยอดใน Postgres ไม่ใช่ใน JS
- **วันที่เป็น `date` ตรึงที่ Asia/Bangkok** — `new Date()` ฝั่ง client ใช้ TZ เครื่องผู้ใช้
- **ขอบเขตสถานะงบต้องตรงกันระหว่าง `lib/money.ts` กับ `v_budget_usage`** — `gate:e2e`
  ยิงเทียบทุกค่าขอบ ถ้าใครแก้ข้างเดียวจะ fail

## หมายเหตุสำหรับเครื่องนี้

`~/.zshrc` บรรทัด 2 มีสองคำสั่งติดกันโดยไม่มีตัวคั่น:

```sh
export PATH="/usr/local/bin:$PATH"export NODE_ENV=development
```

ทำให้ (1) `NODE_ENV=development` ถูก export ทั้งเครื่อง → `npm run build` ล้มด้วย
`TypeError: Cannot read properties of null (reading 'useContext')` และ
(2) `/usr/local/bin` ไม่เคยเข้า PATH (กลายเป็น `/usr/local/binexport`)

ชั่วคราว: `NODE_ENV=production npm run build` — แก้ถาวรดู "ปัญหาสภาพแวดล้อม" ใน
[`docs/development-plan.md`](docs/development-plan.md)

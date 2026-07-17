# ต่อ Supabase cloud + ขึ้น production

ตอนนี้แอปรันกับ Supabase ในเครื่อง (Docker) ทั้งหมด เอกสารนี้คือขั้นตอนย้ายไป cloud
ต้องใช้บัญชีของคุณเอง ทำตามลำดับ

---

## 1. สร้าง project

1. เข้า https://supabase.com/dashboard → **New project**
2. ตั้งชื่อ (เช่น `rairap`) และ **Database Password** — เก็บไว้ในที่ปลอดภัย
   ใช้ตอน `db push` ไม่ใช่ตอนล็อกอินแอป
3. **Region: `Southeast Asia (Singapore)`** — ใกล้ผู้ใช้ไทยที่สุด ลด latency ทุก query
4. รอ project ขึ้นราว 2 นาที

## 2. เชื่อม repo กับ project

หา **Reference ID** ที่ Project Settings → General (หน้าตาเป็น `abcdefghijklmnop`)

```bash
npx supabase login          # เปิดเบราว์เซอร์ให้อนุญาต
npx supabase link --project-ref <REFERENCE_ID>
```

## 3. ส่ง schema ขึ้นไป

```bash
npx supabase db push
```

จะรัน migration ทั้ง 5 ไฟล์ใน `supabase/migrations/` ตามลำดับ ได้ schema + RLS +
view + function ครบเหมือนในเครื่อง

**ตรวจก่อนไปต่อ** — Dashboard → Database → Tables ต้องเห็น `profiles` `categories`
`transactions` `budgets` `dismissed_alerts` `accounts` `recurring_rules` `saving_goals`
และทุกตารางต้องขึ้น **RLS enabled**

## 4. สร้าง bucket สำหรับใบเสร็จ

`db push` สร้างตารางให้ แต่ storage bucket ต้องสร้างแยก:

Dashboard → Storage → **New bucket**
- ชื่อ: `receipts`
- **Public bucket: ปิด** — ใบเสร็จเป็นข้อมูลส่วนตัว ถ้าเปิดจะเปิดให้ใครก็เข้าถึงไฟล์ได้
  ด้วย URL ตรง ๆ โดยไม่ต้องล็อกอิน
- File size limit: `5 MB`
- Allowed MIME types: `image/jpeg, image/png, image/webp, application/pdf`

policy ของ bucket มาจาก migration `20260717...storage.sql` แล้ว ไม่ต้องตั้งในหน้าเว็บ

## 5. ตั้งค่า Auth

Dashboard → Authentication → **URL Configuration**
- **Site URL**: โดเมนจริงของคุณ (เช่น `https://rairap.vercel.app`)
- **Redirect URLs**: เพิ่ม `https://<โดเมน>/**`

Authentication → **Providers** → Email
- **Confirm email: เปิด** — ถ้าปิด ใครก็สมัครด้วยอีเมลคนอื่นได้
- Minimum password length: **8** (ให้ตรงกับ zod schema ในแอป)

## 6. ต่อแอปเข้ากับ cloud

Project Settings → **API** → คัดลอก:
- **Project URL**
- **anon / public key** — ตัวนี้เท่านั้น

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

> **`service_role` key ห้ามใส่ใน `.env.local` และห้ามใส่ใน env ของ Vercel**
> มันข้าม RLS ทั้งหมด แอปนี้ไม่ได้ใช้มันเลย มีแค่ `scripts/*` ที่ใช้ และถูกล็อกให้
> ยิงได้เฉพาะ localhost อยู่แล้ว (`scripts/local-only.mjs`)

ทดสอบในเครื่องก่อน:

```bash
npm run dev     # สมัครบัญชีใหม่ ดูว่า trigger seed หมวดให้ครบ 10 หมวด
```

## 7. Deploy ขึ้น Vercel

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

หรือผ่านหน้าเว็บ: Import repo → ใส่ env สองตัวข้างบน → Deploy

**Build command ปล่อยค่าเริ่มต้น** (`next build`) — ปัญหา `NODE_ENV=development`
ที่ต้องใช้ `NODE_ENV=production npm run build` เป็นเรื่องของเครื่องคุณเองเท่านั้น
(`~/.zshrc` บรรทัด 2 — ดู development-plan.md §8) Vercel ไม่มีปัญหานี้

---

## ตรวจก่อนเปิดให้คนใช้

รันจริงบนโดเมน production:

- [ ] สมัครบัญชีใหม่ → ได้อีเมลยืนยัน → ยืนยันแล้วเข้าได้
- [ ] หมวดเริ่มต้นขึ้นครบ 10 หมวด (trigger `handle_new_user` ทำงาน)
- [ ] เพิ่มรายการ → ยอด hero ขยับ
- [ ] **สมัครบัญชีที่สอง แล้วยืนยันว่ามองไม่เห็นข้อมูลบัญชีแรก** — ข้อนี้สำคัญที่สุด
- [ ] แนบใบเสร็จ → เปิดดูได้ → ลองเอา URL ไปเปิดในหน้าต่างที่ไม่ได้ล็อกอิน **ต้องเปิดไม่ได้**
- [ ] ส่งออก CSV ได้
- [ ] Dashboard → Advisors → **Security Advisor** ต้องไม่มี warning ค้าง

`npm run gate` **รันกับ cloud ไม่ได้** — มันสร้างผู้ใช้ทิ้งและลบ transactions ด้วย
service_role `scripts/local-only.mjs` จึงบล็อกไว้ตั้งใจ ห้ามถอดการ์ดเพื่อรันกับ project จริง

---

## หลังจากนี้ทุกครั้งที่แก้ schema

```bash
npx supabase migration new <ชื่อ>   # เขียน SQL ในไฟล์ที่ได้
npm run db:reset                    # ทดสอบในเครื่อง
npm run db:types                    # อัปเดต lib/database.types.ts
npm run gate                        # ต้องเขียวหมด
npx supabase db push                # แล้วค่อยส่งขึ้น cloud
```

**ห้ามแก้ไฟล์ migration ที่ push ไปแล้ว** — cloud จำว่าไฟล์ไหนรันไปแล้วจาก checksum
แก้ของเก่าแล้วจะไม่ถูกรันซ้ำ และเครื่องคุณกับ cloud จะ schema ไม่ตรงกันแบบเงียบ ๆ
ให้เพิ่มไฟล์ใหม่เสมอ

## สำรองข้อมูล

Free tier ไม่มี backup อัตโนมัติ ถ้ามีข้อมูลจริงแล้ว:

```bash
npx supabase db dump -f backup-$(date +%F).sql --linked
```

หรืออัปเป็น Pro ซึ่งมี Point-in-Time Recovery

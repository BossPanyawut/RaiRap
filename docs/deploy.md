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

## 4. bucket สำหรับใบเสร็จ

**ไม่ต้องทำอะไร** — migration `20260717090100_receipts_storage.sql` สร้าง bucket
`receipts` (private, 5 MB, เฉพาะรูปกับ PDF) และ policy ให้ครบตอน `db push` แล้ว

ตรวจว่าได้จริง: Dashboard → Storage → ต้องเห็น `receipts` และ **ไม่มีป้าย Public**

## 5. ตั้งค่า Auth

ค่า auth ทั้งหมดอยู่ใน **`supabase/config.toml`** ซึ่งอยู่ใน git — แก้ที่ไฟล์แล้ว
`npx supabase config push` อย่าไปคลิกใน Dashboard เพราะจะถูก push ทับ

> `config push` ดันทั้งไฟล์ ไม่ใช่แค่ `[auth]` ค่าใน `[storage]` `[api]` `[db]`
> ก็ขึ้นไปด้วย ถ้าเจอ `402 upgrade to a paid tier` แปลว่ามีฟีเจอร์ที่ free tier
> ใช้ไม่ได้เปิดค้างอยู่ (เช่น `[storage.vector]` ที่ CLI ตั้ง `true` มาให้เอง)

**สถานะตอนนี้: `enable_confirmations = false`** — ปิดยืนยันอีเมลไว้เพราะ SMTP
ในตัวจำกัด 2 ฉบับ/ชั่วโมง แปลว่า **ใครก็สมัครด้วยอีเมลของคนอื่นได้**
ต่อ SMTP แล้วกลับเป็น `true` ก่อนเปิดให้คนนอกใช้

ค่าที่เหลือดูได้ที่ Dashboard → Authentication → **URL Configuration**
- **Site URL**: โดเมนจริงของคุณ (เช่น `https://rairap.vercel.app`)
- **Redirect URLs**: เพิ่ม `https://<โดเมน>/**`

ค่าเริ่มต้นคือ `http://localhost:3000` — **ถ้าไม่แก้ ลิงก์ยืนยันในอีเมลจะชี้กลับ
เครื่อง localhost ของผู้ใช้เอง กดแล้วเปิดไม่ได้ = สมัครไม่สำเร็จสักคน**
ตั้งได้หลัง deploy Vercel เสร็จ (ข้อ 7) แล้วค่อยกลับมาแก้

Authentication → **Providers** → Email
- **Confirm email: เปิด** — ถ้าปิด ใครก็สมัครด้วยอีเมลคนอื่นได้
- Minimum password length: **8** (ให้ตรงกับ zod schema ในแอป)

### ⚠️ SMTP — ตัวปิดกั้นการเปิดใช้จริง

Supabase ให้ SMTP ในตัวมาเพื่อ**ทดสอบเท่านั้น** จำกัด `rate_limit_email_sent`
ไว้ที่ **2 ฉบับ/ชั่วโมง ทั้ง project** ไม่ใช่ต่อคน แปลว่า:

- คนที่ 3 ที่สมัครในชั่วโมงนั้น **สมัครไม่ได้** ได้ error `email rate limit exceeded`
- ลืมรหัสผ่านก็กินโควตาเดียวกัน
- ไม่มี captcha → บอทยิงสมัครรัว ๆ ทำให้คนจริงสมัครไม่ได้ทั้งวัน

**ยกเพดานเฉย ๆ ไม่ได้** — ลองแล้ว Management API ปฏิเสธการตั้ง
`rate_limit_email_sent` สูงกว่า 2 ตราบใดที่ `smtp_host` ยังว่าง และการเปิด
`mailer_autoconfirm` ก็ไม่ช่วย เพราะตัวนับถูกเช็คแม้ไม่ได้ส่งอีเมลจริง
Supabase ล็อกไว้ที่ชั้น platform

ก่อนเปิดให้คนใช้ต้องต่อ SMTP ของตัวเอง — เลือก **Resend** ไว้แล้ว
(free 3,000 ฉบับ/เดือน) บล็อก config เตรียมไว้ใน `supabase/config.toml` แล้ว:

1. สมัคร https://resend.com → **Domains** → เพิ่มโดเมนแล้วใส่ DNS record ตามที่บอก
   (ระหว่างรอ verify ใช้ `onboarding@resend.dev` เป็นผู้ส่งทดสอบได้)
2. **API Keys** → สร้าง key (สิทธิ์ Sending access พอ) — เก็บไว้ ห้าม commit
3. ใน `supabase/config.toml`: เปิดบล็อก `[auth.email.smtp]`,
   แก้ `admin_email` เป็นอีเมลบนโดเมนที่ verify แล้ว,
   เปลี่ยน `enable_confirmations` เป็น `true`,
   ขยับ `[auth.rate_limit] email_sent` จาก 2 → 100
4. `RESEND_API_KEY=<key> npx supabase config push`
5. ทดสอบทันที: สมัครบัญชีใหม่บนโดเมนจริง ต้องได้อีเมลยืนยันภายในไม่กี่วินาที

ทั้งหมดนี้ต้องไปด้วยกันใน push เดียว — เปิด `enable_confirmations` โดยยังไม่ต่อ
SMTP = สมัครได้ 2 คน/ชั่วโมงทั้งระบบ

### Captcha — เปิดก่อนปล่อยสาธารณะ

ไม่มี captcha บอทจะยิงสมัครจนโควตาอีเมลหมดและคนจริงสมัครไม่ได้
โค้ดฝั่งแอปพร้อมแล้ว (`components/turnstile.tsx` + server action ส่ง token แล้ว)
ขั้นตอนเปิดอยู่ในคอมเมนต์เหนือบล็อก `[auth.captcha]` ใน `supabase/config.toml` —
สรุป: สร้าง site ใน Cloudflare Turnstile → ตั้ง `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
ใน Vercel + redeploy → เปิดบล็อกแล้ว `TURNSTILE_SECRET_KEY=<secret> npx supabase config push`
**ต้องครบทั้งสองฝั่ง** เปิดฝั่งเดียว login จะพังหรือไม่ได้กันอะไรเลย

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

**Build command ปล่อยค่าเริ่มต้น** (`next build`)

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
- [ ] ต่อ Resend แล้ว + `enable_confirmations = true` (ไม่งั้นสมัครได้ 2 คน/ชั่วโมง
      และใครก็สมัครด้วยอีเมลคนอื่นได้)
- [ ] เปิด Turnstile ครบทั้งสองฝั่ง (Vercel env + config push)
- [ ] ตั้ง secret ของ workflow backup แล้วรัน manual หนึ่งรอบ เขียว
- [ ] เปิด `/welcome` `/terms` `/privacy` โดยไม่ล็อกอิน ต้องเข้าได้ทั้งสามหน้า
- [ ] Site URL ชี้โดเมนจริง ไม่ใช่ localhost

ตรวจอัตโนมัติได้ด้วย:

```bash
node scripts/verify-cloud.mjs
```

ยิงผ่าน publishable key เหมือนที่เบราว์เซอร์ทำ ตรวจว่า anon เข้าไม่ถึง, 2 บัญชี
มองไม่เห็นกัน, ใบเสร็จข้ามคนไม่ได้ แล้วลบบัญชีทดสอบทิ้ง
**ต้องต่อ SMTP ก่อน** ไม่งั้นติด rate limit ตอนสมัคร

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

Free tier ไม่มี backup อัตโนมัติ — repo นี้มี workflow สำรองรายวันให้แล้ว
(`.github/workflows/db-backup.yml`) dump ตอน 03:00 เวลาไทย เข้ารหัสด้วย
AES-256 แล้วเก็บเป็น artifact 30 วัน

เปิดใช้: ตั้ง secret 2 ตัวที่ GitHub → Settings → Secrets and variables → Actions

| Secret | ค่า |
|---|---|
| `SUPABASE_DB_URL` | connection string จาก Dashboard → Project Settings → Database |
| `BACKUP_PASSPHRASE` | วลีลับยาว ๆ สำหรับเข้ารหัสไฟล์ — **เก็บไว้ให้ดี ไฟล์กู้ไม่ได้ถ้าลืม** |

**ต้องเข้ารหัสเพราะ repo เป็น public** — artifact ของ public repo ใครก็โหลดได้
dump เปล่า = ข้อมูลการเงินผู้ใช้ทุกคนหลุด

ตั้งแล้วกด **Run workflow** (workflow_dispatch) หนึ่งรอบเพื่อยืนยันว่าเขียว
วิธีกู้คืนอยู่ในคอมเมนต์หัวไฟล์ workflow

สำรองมือเมื่อไหร่ก็ได้:

```bash
npx supabase db dump -f backup-$(date +%F).sql --linked
```

หรืออัปเป็น Pro ซึ่งมี Point-in-Time Recovery

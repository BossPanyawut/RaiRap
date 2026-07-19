# RaiRap — Security

วิเคราะห์ + มาตรการ ณ 2026-07-19 ทุกข้อที่เขียนว่า "gate" มีเช็คอัตโนมัติใน `npm run gate`
ถ้าแก้โค้ดแล้วมาตรการไหนหลุด gate จะแดงก่อนถึง production

## 1. ปกป้องอะไร

| ทรัพย์สิน | ทำไมสำคัญ |
|---|---|
| รายการเงินของผู้ใช้ (transactions, budgets, goals) | ประวัติการเงินส่วนบุคคลทั้งชีวิตการใช้แอป |
| ใบเสร็จ (Storage) | มีชื่อร้าน ยอดเงิน บางใบมีเลขบัตร |
| บัญชี + session | ยึดได้ = อ่าน/แก้/ลบทุกอย่างข้างบน |

ผู้โจมตีที่คิดถึง: (ก) ผู้ใช้ล็อกอินคนอื่นที่พยายามอ่านข้อมูลข้ามบัญชี
(ข) คนนอกที่ยิง API ตรงด้วย anon key ที่เห็นในเบราว์เซอร์ (ค) บอทสมัคร/สแปม
(ง) ไฟล์มุ่งร้ายที่ผู้ใช้อัปโหลดหรือเปิด (CSV/ใบเสร็จ)

## 2. เส้นแบ่งความเชื่อใจ

```
เบราว์เซอร์ ──▶ Vercel (RSC + Server Actions + proxy.ts) ──▶ Supabase (Auth + Postgres + Storage)
   ไม่เชื่อ         ตรวจ input (zod) + session (getUser)          RLS = คนตัดสินจริง
```

- **RLS คือชั้น authorization เดียวที่นับ** — anon key อยู่ในเบราว์เซอร์โดยตั้งใจ
  ใครยิง PostgREST ตรงก็เจอ policy เดียวกับแอป (gate:rls ยิงข้าม user ด้วย JWT จริง)
- `proxy.ts` แค่รีเฟรช session cookie + เด้ง path เพื่อ UX — ไม่ใช่ด่านข้อมูล
- ฝั่ง server ใช้ `getUser()` เสมอ (ตรวจลายเซ็นกับ auth server) ไม่ใช่ `getSession()`

## 3. มาตรการที่บังคับอยู่

### ฐานข้อมูล
- RLS ทุกตาราง (`auth.uid() = user_id`) + `GRANT` เฉพาะ `SELECT/INSERT/UPDATE/DELETE`
  ให้ `authenticated` — `TRUNCATE` ถูกริบ (RLS ไม่คุม TRUNCATE), `anon` ไม่ได้อะไรเลย — gate:rls
- ทุก view `security_invoker = true` — view ไม่เป็นประตูหลังข้าม RLS — gate:rls
- ฟังก์ชันที่แตะข้อมูลผู้ใช้ (`reset_my_categories`, `delete_my_account`) อ่าน
  `auth.uid()` เอง ไม่รับ uuid เป็น argument — ยิงใส่บัญชีคนอื่นไม่ได้ — gate:settings
- เงิน `numeric(12,2) check (amount > 0)` วันที่เป็น `date` — ค่าประหลาดตกที่ constraint

### Storage (ใบเสร็จ)
- bucket private, จำกัด 5 MB + MIME เฉพาะรูป/PDF ที่ชั้น bucket (ไม่ใช่แค่ฝั่งแอป)
- path บังคับ `<uid>/…` — policy เทียบ `storage.foldername(name)[1]` กับ `auth.uid()`
  ทั้งอ่าน/อัป/ลบ ไม่มี policy UPDATE (เขียนทับไฟล์ไม่ได้) — gate:extras
- เปิดดูผ่าน signed URL อายุ 300 วินาที — ลิงก์หลุดแล้วตายเอง

### Auth
- รหัสผ่าน ≥8 ตรงกันทั้ง zod และ `minimum_password_length` ใน config.toml
- เปลี่ยนรหัส / เปลี่ยนอีเมล / ลบบัญชี ต้อง re-auth ด้วยรหัสปัจจุบันก่อน — gate:settings
- ข้อความ error ของ login/signup เป็นแบบ generic — ไม่ยืนยันว่าอีเมลไหนมีบัญชี
  (กัน account enumeration)
- ไม่ติ๊ก "จดจำฉัน" = session cookie ไม่มีอายุ ปิดเบราว์เซอร์แล้วหาย
- Turnstile captcha: โค้ดพร้อมทั้งสองฝั่ง เปิดด้วย key (deploy.md §5)
- ยืนยันอีเมล: เปิดพร้อม SMTP ใน push เดียว (ดู §5 — ความเสี่ยงคงเหลือ)

### เว็บ
- **Security headers ทุก response** (`next.config.ts`) — gate:a11y:
  CSP (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, connect/img/frame จำกัดปลายทางแค่ตัวเอง + Supabase +
  Turnstile), `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  Permissions-Policy ปิด camera/mic/geolocation/payment, HSTS
- **Open redirect**: `?next=` หลัง login ผ่าน `safeNextPath()` — รับเฉพาะ path
  ภายใน ปฏิเสธ `//evil.com` และ `/\evil.com` — gate:a11y
- **CSV formula injection**: เซลล์ที่ขึ้นต้น `= + - @` ถูกนำหน้า `'` ตอน export
  (OWASP) และถอดกลับตอน import — ไป-กลับข้อมูลไม่เปลี่ยน — gate:settings
- อัปโหลดตรวจชนิด/ขนาดฝั่ง server ก่อนถึง bucket (ซึ่งตรวจซ้ำอีกชั้น)
- export CSV ตอบ `Cache-Control: no-store, private`
- input ทุกฟอร์มผ่าน zod ทั้ง client และ Server Action

### Secrets
- เบราว์เซอร์เห็นแค่ anon/publishable key — `sb_secret_…`/service_role ไม่อยู่ใน
  `.env.local` และห้ามอยู่ใน env ของ Vercel
- scripts ที่ใช้ service_role ถูก `scripts/local-only.mjs` บังคับชี้ localhost เท่านั้น
- ค่า secret ใน `config.toml` อ่านจาก env (`env(RESEND_API_KEY)` ฯลฯ) ไม่ commit

### Supply chain + สำรองข้อมูล
- `npm audit` = 0 vulnerabilities (postcss ถูก override ≥8.5.10 ปิด GHSA-qx2v-qp2m-jg93)
- backup รายวันเข้ารหัส AES-256 ก่อนขึ้น artifact — repo เป็น public ห้ามมี dump เปล่า

## 4. เช็คอะไรที่ไหน

| การโจมตี | กันที่ | gate |
|---|---|---|
| อ่าน/เขียนข้ามบัญชี | RLS + GRANT | gate:rls |
| view/function ข้าม RLS | security_invoker + auth.uid() | gate:rls, gate:settings |
| ใบเสร็จข้ามคน | storage policy per-uid | gate:extras |
| clickjacking / ฝัง iframe | CSP frame-ancestors + XFO | gate:a11y |
| open redirect | safeNextPath | gate:a11y |
| CSV formula injection | guardFormula | gate:settings |
| ล้างข้อมูลทั้งระบบด้วยบัญชีเดียว | ริบ TRUNCATE | gate:rls |

## 5. ความเสี่ยงคงเหลือ (รู้แล้ว เลือกแล้ว)

1. **`enable_confirmations = false`** — ช่องโหว่จริงจนกว่าจะต่อ Resend
   (deploy.md §5) **ห้ามเปิดรับผู้ใช้จริงก่อนปิดข้อนี้**
2. **CSP มี `'unsafe-inline'` ใน script-src** — Next ต้องใช้ inline script ตอน
   hydrate ทางแก้เต็มคือ nonce ผ่าน proxy (งานใหญ่ ค่อยทำเมื่อคุ้ม)
   ระหว่างนี้ CSP ยังจำกัดปลายทาง connect/img — สคริปต์ที่ inject มา exfiltrate ยาก
3. **ไม่มี MFA** — Supabase รองรับ TOTP แต่เป็นฟีเจอร์ Pro plan
4. **Auth cookie อ่านได้ด้วย JS** — ธรรมชาติของ @supabase/ssr (client ต้องใช้)
   การกันจริงคือกัน XSS ตั้งแต่ต้นทาง: React escape + CSP + ไม่มี
   dangerouslySetInnerHTML ในโค้ด
5. **Rate limit ระดับแอป** — พึ่ง Supabase auth rate limits + Turnstile
   ส่วน action อื่นชนเพดาน Vercel/Supabase เอง ยังไม่ทำ per-user throttle
6. **Free tier ไม่มี Point-in-Time Recovery** — มีแค่ backup รายวัน จุดข้อมูล
   หายได้มากสุด 24 ชั่วโมง อัป Pro เมื่อมีผู้ใช้จริงจัง

## 6. ถ้า key หลุด

| หลุดอะไร | ทำทันที |
|---|---|
| `sb_secret_…` / service_role | Dashboard → Settings → API → Rotate ทันที (ตัวนี้ข้าม RLS ทั้งหมด) |
| anon / publishable | เสี่ยงต่ำ (RLS กันอยู่) แต่ rotate ได้ที่เดียวกัน + อัปเดต Vercel env |
| `RESEND_API_KEY` | resend.com → API Keys → revoke แล้วออกใหม่ + push config |
| `SUPABASE_DB_URL` (backup secret) | Reset database password ใน Dashboard แล้วแก้ secret ใน GitHub |
| `BACKUP_PASSPHRASE` | เปลี่ยน secret — ไฟล์เก่าที่เข้ารหัสด้วยค่าเดิมถือว่า exposed ลบ artifact เก่าทิ้ง |

หลังเหตุการณ์: ไล่ Dashboard → Advisors → Security Advisor + `node scripts/verify-cloud.mjs`

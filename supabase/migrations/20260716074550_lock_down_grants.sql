-- Supabase ตั้ง default privileges ใน schema public ไว้ ทำให้ทุกตารางที่สร้างใหม่
-- ติด REFERENCES / TRIGGER / TRUNCATE ให้ anon, authenticated, service_role
-- มาเองโดยไม่ได้ขอ
--
-- ตัวที่ต้องปิดคือ TRUNCATE: **RLS ไม่บังคับกับ TRUNCATE** (Postgres ไม่กรอง row
-- policy ให้คำสั่งนี้เลย) ต่อให้ policy แน่นแค่ไหน ใครที่มีสิทธิ์ TRUNCATE ก็ล้าง
-- ข้อมูลของผู้ใช้ทุกคนได้ในคำสั่งเดียว — ค่า default จึงให้สิทธิ์นี้กับผู้ใช้ที่
-- ล็อกอินทุกคน ซึ่งขัดกับหลักประกันทั้งหมดที่ RLS วางไว้
--
-- ตอนนี้ PostgREST ไม่เปิด TRUNCATE ผ่าน REST จึงยังเอื้อมไม่ถึงจากฝั่งแอป
-- แต่ไม่มีเหตุผลให้ถือสิทธิ์นี้ไว้ — ให้เท่าที่ใช้จริงเท่านั้น

-- ล้างของที่ default แถมมาให้หมดก่อน แล้วค่อยให้เฉพาะที่ต้องใช้
revoke all on profiles, categories, transactions, budgets from anon, authenticated;
revoke all on v_monthly_summary, v_running_balance, v_budget_usage
from anon, authenticated;

-- ผู้ใช้ที่ล็อกอิน: DML สี่คำสั่งเท่านั้น ไม่มี TRUNCATE/REFERENCES/TRIGGER
-- แถวไหนแตะได้ RLS เป็นคนตัดสิน
grant select, insert, update, delete
on profiles, categories, transactions, budgets to authenticated;
grant select on v_monthly_summary, v_running_balance, v_budget_usage
to authenticated;

-- anon ไม่ได้อะไรเลย — ยังไม่ล็อกอินก็ถูกปฏิเสธที่ชั้น privilege ก่อนถึง RLS ด้วยซ้ำ

-- ไม่ให้ตารางที่สร้างในอนาคตติดสิทธิ์เกินมาอีก
alter default privileges in schema public
revoke all on tables from anon, authenticated;

-- service_role คือ key ฝั่งเซิร์ฟเวอร์ (bypass RLS) ใช้ทำ migration/backfill/ทดสอบ
-- key นี้ห้ามหลุดถึงเบราว์เซอร์ — ในโปรเจกต์นี้ .env.local มีแค่ anon key เท่านั้น
grant select, insert, update, delete
on profiles, categories, transactions, budgets to service_role;
grant select on v_monthly_summary, v_running_balance, v_budget_usage
to service_role;

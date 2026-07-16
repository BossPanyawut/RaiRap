/**
 * สร้างบัญชีทดลอง + ข้อมูล 3 เดือนสำหรับเปิดดูในเครื่อง
 * รันซ้ำได้ — ลบบัญชีเดิมทิ้งก่อนเสมอ
 *
 * ใช้กับ Supabase ในเครื่องเท่านั้น (local-only.mjs บังคับไว้)
 */
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-only.mjs";

const { url, service } = localSupabase();
const admin = createClient(url, service, { auth: { persistSession: false } });

const EMAIL = "demo@rairap.dev";
const PASSWORD = "demo1234";

// ลบบัญชีเดิมถ้ามี — cascade ลบ transactions/budgets/categories ตามไปด้วย
const { data: existing } = await admin.auth.admin.listUsers();
for (const u of existing.users.filter((u) => u.email === EMAIL)) {
  await admin.auth.admin.deleteUser(u.id);
}

const { data: created, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { display_name: "ปัญญาวุฒิ" },
});
if (error) throw error;
const uid = created.user.id;

const { data: cats } = await admin.from("categories").select("*").eq("user_id", uid);
const id = (name, kind) => cats.find((c) => c.name === name && c.kind === kind).id;

const period = (n) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const THIS = period(0);

const tx = [];
const add = (month, day, name, kind, amount, note) =>
  tx.push({
    user_id: uid,
    category_id: id(name, kind),
    kind,
    amount,
    occurred_on: `${month}-${String(day).padStart(2, "0")}`,
    note,
  });

// ---- สองเดือนก่อน: ปกติ เหลือเยอะ ----
add(period(-2), 1, "เงินเดือน", "income", 32000, "เงินเดือน");
add(period(-2), 3, "ที่พัก", "expense", 7500, "ค่าเช่าห้อง");
add(period(-2), 5, "อาหาร", "expense", 4200, null);
add(period(-2), 9, "เดินทาง", "expense", 1800, "ค่ารถไฟฟ้า");
add(period(-2), 14, "บันเทิง", "expense", 900, "ดูหนัง");
add(period(-2), 20, "ช้อปปิ้ง", "expense", 1500, null);

// ---- เดือนก่อน: ใช้เยอะขึ้น ----
add(period(-1), 1, "เงินเดือน", "income", 32000, "เงินเดือน");
add(period(-1), 2, "รายได้เสริม", "income", 4500, "งานฟรีแลนซ์");
add(period(-1), 3, "ที่พัก", "expense", 7500, "ค่าเช่าห้อง");
add(period(-1), 6, "อาหาร", "expense", 5600, null);
add(period(-1), 8, "เดินทาง", "expense", 2400, null);
add(period(-1), 12, "สุขภาพ", "expense", 1200, "หาหมอฟัน");
add(period(-1), 18, "ช้อปปิ้ง", "expense", 3800, "รองเท้า");
add(period(-1), 25, "บันเทิง", "expense", 1100, null);

// ---- เดือนนี้: จงใจให้เห็นครบ 3 สถานะงบ ----
add(THIS, 1, "เงินเดือน", "income", 32000, "เงินเดือน");
add(THIS, 3, "ที่พัก", "expense", 7500, "ค่าเช่าห้อง");
// อาหาร 5,400 / งบ 5,000 → 108% = เกินงบ (over)
add(THIS, 2, "อาหาร", "expense", 1250.5, "ข้าวกล่องทั้งอาทิตย์");
add(THIS, 5, "อาหาร", "expense", 890, null);
add(THIS, 8, "อาหาร", "expense", 1560.25, "เลี้ยงข้าวเพื่อน");
add(THIS, 11, "อาหาร", "expense", 720, null);
add(THIS, 14, "อาหาร", "expense", 979.25, "ซื้อของเข้าครัว");
// เดินทาง 1,700 / งบ 2,000 → 85% = ใกล้เต็ม (warn)
add(THIS, 4, "เดินทาง", "expense", 780, "เติมน้ำมัน");
add(THIS, 9, "เดินทาง", "expense", 620, null);
add(THIS, 13, "เดินทาง", "expense", 300, "แท็กซี่");
// บันเทิง 640 / งบ 2,000 → 32% = สบาย (ok) — ไม่โผล่บน dashboard
add(THIS, 7, "บันเทิง", "expense", 349, "ค่าสมาชิก Netflix");
add(THIS, 10, "บันเทิง", "expense", 291, null);
// สุขภาพ ไม่ได้ตั้งงบ
add(THIS, 6, "สุขภาพ", "expense", 450, "ยาแก้แพ้");

await admin.from("transactions").insert(tx);

await admin.from("budgets").insert([
  { user_id: uid, category_id: id("อาหาร", "expense"), kind: "expense", period_month: `${THIS}-01`, amount: 5000 },
  { user_id: uid, category_id: id("เดินทาง", "expense"), kind: "expense", period_month: `${THIS}-01`, amount: 2000 },
  { user_id: uid, category_id: id("บันเทิง", "expense"), kind: "expense", period_month: `${THIS}-01`, amount: 2000 },
  { user_id: uid, category_id: id("ที่พัก", "expense"), kind: "expense", period_month: `${THIS}-01`, amount: 8000 },
]);

const { data: usage } = await admin
  .from("v_budget_usage")
  .select("category_name, spent, budget_amount, pct, status")
  .eq("user_id", uid)
  .order("pct", { ascending: false });

const { data: bal } = await admin
  .from("v_running_balance")
  .select("period_month, income, expense, balance")
  .eq("user_id", uid)
  .order("period_month");

console.log(`\nบัญชีทดลองพร้อมแล้ว\n`);
console.log(`  อีเมล    ${EMAIL}`);
console.log(`  รหัสผ่าน  ${PASSWORD}`);
console.log(`  เปิดที่   http://localhost:3000/login\n`);
console.log(`ใส่ ${tx.length} รายการ ครอบคลุม 3 เดือน\n`);
console.table(usage);
console.table(bal);

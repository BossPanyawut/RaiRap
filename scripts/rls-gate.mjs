import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-only.mjs";

const { url: SB, anon: ANON, service: SERVICE } = localSupabase();


const admin = createClient(SB, SERVICE, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (ok) { pass++; } else { fail++; }
};

// ---- สร้างผู้ใช้สองคน ----
const mk = async (email) => {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "password123", email_confirm: true,
    user_metadata: { display_name: email.split("@")[0] },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user;
};
const alice = await mk(`alice${Date.now()}@test.local`);
const bob = await mk(`bob${Date.now()}@test.local`);

const signIn = async (email) => {
  const c = createClient(SB, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: "password123" });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
};
const aliceC = await signIn(alice.email);
const bobC = await signIn(bob.email);

// ---- trigger seed ทำงานไหม ----
{
  const { data } = await aliceC.from("profiles").select("*");
  check("trigger สร้าง profile ให้ผู้ใช้ใหม่", data?.length === 1, `เห็น ${data?.length} แถว`);
  const { data: cats } = await aliceC.from("categories").select("*");
  check("trigger seed หมวดเริ่มต้น", cats?.length === 10, `เห็น ${cats?.length} หมวด`);
}

// ---- Alice ใส่ข้อมูล ----
const { data: aliceCats } = await aliceC.from("categories").select("*").eq("kind", "expense");
const food = aliceCats.find((c) => c.name === "อาหาร");
const { error: insErr } = await aliceC.from("transactions").insert({
  user_id: alice.id, category_id: food.id, kind: "expense",
  amount: 250.5, occurred_on: "2026-07-10", note: "ข้าวมันไก่",
});
check("Alice เพิ่มรายการของตัวเองได้", !insErr, insErr?.message ?? "");

// ================= GATE หลัก =================
console.log("\n--- GATE: Bob ต้องมองไม่เห็น/แตะข้อมูล Alice ไม่ได้ ---");

{
  const { data } = await bobC.from("transactions").select("*");
  check("Bob select transactions ทั้งหมด → 0 แถว", data?.length === 0, `ได้ ${data?.length} แถว`);
}
{
  // ยิงตรงด้วย user_id ของ Alice — ไม่ใช่แค่ UI ซ่อน
  const { data } = await bobC.from("transactions").select("*").eq("user_id", alice.id);
  check("Bob select ระบุ user_id ของ Alice → 0 แถว", data?.length === 0, `ได้ ${data?.length} แถว`);
}
{
  const { data } = await bobC.from("categories").select("*").eq("user_id", alice.id);
  check("Bob select categories ของ Alice → 0 แถว", data?.length === 0, `ได้ ${data?.length} แถว`);
}
{
  const { data } = await bobC.from("profiles").select("*").eq("id", alice.id);
  check("Bob select profile ของ Alice → 0 แถว", data?.length === 0, `ได้ ${data?.length} แถว`);
}
{
  // เขียนสวมรอย
  const { error } = await bobC.from("transactions").insert({
    user_id: alice.id, category_id: food.id, kind: "expense",
    amount: 999, occurred_on: "2026-07-11",
  });
  check("Bob insert สวมรอย user_id ของ Alice → ถูกปฏิเสธ", !!error, error?.message ?? "ไม่ error = ช่องโหว่!");
}
{
  const { data, error } = await bobC.from("transactions").update({ amount: 1 }).eq("user_id", alice.id).select();
  check("Bob update รายการ Alice → ไม่โดนแถวไหน", !error && data?.length === 0, `แก้ได้ ${data?.length} แถว`);
}
{
  const { data, error } = await bobC.from("transactions").delete().eq("user_id", alice.id).select();
  check("Bob delete รายการ Alice → ไม่โดนแถวไหน", !error && data?.length === 0, `ลบได้ ${data?.length} แถว`);
}

// ---- GATE: view ต้องไม่ข้าม RLS (security_invoker) ----
console.log("\n--- GATE: view ต้องไม่เป็นประตูหลัง ---");
for (const v of ["v_monthly_summary", "v_running_balance", "v_budget_usage"]) {
  const { data, error } = await bobC.from(v).select("*");
  check(`Bob select ${v} → 0 แถว`, !error && data?.length === 0, error?.message ?? `ได้ ${data?.length} แถว`);
}
{
  const { data } = await aliceC.from("v_monthly_summary").select("*");
  check("Alice เห็นสรุปของตัวเอง", data?.length === 1 && Number(data[0].expense) === 250.5,
    JSON.stringify(data?.[0]));
}
{
  const args = {
    p_from: "2026-07-01", p_to: "2026-07-31", p_scope: "month",
  };
  const [{ data: aliceSummary, error: aliceError }, { data: bobSummary, error: bobError }] = await Promise.all([
    aliceC.rpc("transaction_calendar_summary", args),
    bobC.rpc("transaction_calendar_summary", args),
  ]);
  check(
    "calendar summary ของ Alice รวมเงินใน Postgres ถูกต้อง",
    !aliceError && aliceSummary?.length === 1 && Number(aliceSummary[0].expense) === 250.5,
    aliceError?.message ?? JSON.stringify(aliceSummary),
  );
  check(
    "calendar summary ยังผ่าน RLS → Bob เห็น 0 แถว",
    !bobError && bobSummary?.length === 0,
    bobError?.message ?? `ได้ ${bobSummary?.length} แถว`,
  );
}

// ---- GATE: anon (ไม่ล็อกอิน) ----
console.log("\n--- GATE: ยังไม่ล็อกอิน ---");
for (const rel of ["transactions", "categories", "profiles", "budgets", "v_monthly_summary"]) {
  const anonC = createClient(SB, ANON, { auth: { persistSession: false } });
  const { data, error } = await anonC.from(rel).select("*");
  // anon ไม่มี GRANT เลย จึงโดนปฏิเสธที่ชั้น privilege (42501) ก่อนถึง RLS ด้วยซ้ำ
  // แข็งกว่าการกรองเหลือ 0 แถว — ยอมรับทั้งสองแบบ แต่ต้องไม่มีข้อมูลหลุด
  const blocked = error?.code === "42501" || data?.length === 0;
  check(`anon select ${rel} → เข้าไม่ถึง`, blocked, error?.code === "42501" ? "42501 ปฏิเสธที่ชั้น privilege" : `ได้ ${data?.length} แถว`);
}
{
  const anonC = createClient(SB, ANON, { auth: { persistSession: false } });
  const { data, error } = await anonC.rpc("transaction_calendar_summary", {
    p_from: "2026-07-01", p_to: "2026-07-31", p_scope: "month",
  });
  check(
    "anon เรียก calendar summary ไม่ได้",
    Boolean(error) && !data,
    error?.message ?? "เรียกได้ = สิทธิ์กว้างเกิน",
  );
}

// ---- constraint integrity ----
console.log("\n--- constraint ---");
{
  const inc = aliceCats.length ? (await aliceC.from("categories").select("*").eq("kind", "income")).data[0] : null;
  const { error } = await aliceC.from("transactions").insert({
    user_id: alice.id, category_id: inc.id, kind: "expense", amount: 10, occurred_on: "2026-07-10",
  });
  check("kind ไม่ตรงกับหมวด → composite FK ปฏิเสธ", !!error, error?.message?.slice(0, 60) ?? "ไม่ error = หลุด!");
}
{
  const { error } = await aliceC.from("transactions").insert({
    user_id: alice.id, category_id: food.id, kind: "expense", amount: -5, occurred_on: "2026-07-10",
  });
  check("amount ติดลบ → check ปฏิเสธ", !!error, error?.message?.slice(0, 50) ?? "ไม่ error = หลุด!");
}
{
  const { error } = await aliceC.from("budgets").insert({
    user_id: alice.id, category_id: food.id, period_month: "2026-07-15", amount: 5000,
  });
  check("period_month ไม่ใช่วันที่ 1 → check ปฏิเสธ", !!error, error?.message?.slice(0, 50) ?? "ไม่ error = หลุด!");
}
{
  const inc = (await aliceC.from("categories").select("*").eq("kind", "income")).data[0];
  const { error } = await aliceC.from("budgets").insert({
    user_id: alice.id, category_id: inc.id, period_month: "2026-07-01", amount: 5000,
  });
  check("ตั้งงบให้หมวด income → ปฏิเสธ", !!error, error?.message?.slice(0, 60) ?? "ไม่ error = หลุด!");
}

console.log(`\n${fail === 0 ? "GATE ผ่าน" : "GATE ไม่ผ่าน"} — pass ${pass} / fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);

import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-only.mjs";
import { parseCSV, toCSV } from "../lib/csv.ts";

const { url: SB, anon: ANON, service: SERVICE } = localSupabase();
const admin = createClient(SB, SERVICE, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
  if (ok) { pass++; } else { fail++; }
};

const mk = async (tag) => {
  const email = `${tag}${Date.now()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "password123", email_confirm: true,
    user_metadata: { display_name: tag },
  });
  if (error) throw error;
  const c = createClient(SB, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: "password123" });
  return { user: data.user, client: c, email };
};

const alice = await mk("alice");
const bob = await mk("bob");
const cats = async (u) => (await admin.from("categories").select("*").eq("user_id", u.id)).data;
const aCats = await cats(alice.user);
const id = (n, k) => aCats.find((c) => c.name === n && c.kind === k).id;

// ═══════════ รอบเดือนกำหนดเอง ═══════════
console.log("--- รอบเดือนกำหนดเอง ---");
{
  const { data } = await admin.rpc("period_of", { d: "2026-07-24", cycle_day: 25 });
  check("period_of(24 ก.ค., รอบ 25) → รอบ มิ.ย.", data === "2026-06-01", String(data));
  const { data: d2 } = await admin.rpc("period_of", { d: "2026-07-25", cycle_day: 25 });
  check("period_of(25 ก.ค., รอบ 25) → รอบ ก.ค.", d2 === "2026-07-01", String(d2));
  const { data: d3 } = await admin.rpc("period_of", { d: "2026-08-24", cycle_day: 25 });
  check("period_of(24 ส.ค., รอบ 25) → ยังเป็นรอบ ก.ค.", d3 === "2026-07-01", String(d3));

  // cycle=1 ต้องเท่ากับ date_trunc เป๊ะ = ของเดิมไม่พัง
  let same = true;
  for (const d of ["2026-01-01", "2026-02-28", "2026-07-15", "2026-12-31"]) {
    const { data: r } = await admin.rpc("period_of", { d, cycle_day: 1 });
    if (r !== `${d.slice(0, 7)}-01`) same = false;
  }
  check("cycle=1 ให้ผลเท่า date_trunc เป๊ะ (ของเดิมไม่พัง)", same);
}

// ═══════════ เปลี่ยนรอบแล้วยอดจัดกลุ่มใหม่ ═══════════
{
  const salary = id("เงินเดือน", "income");
  const food = id("อาหาร", "expense");
  await admin.from("transactions").insert([
    { user_id: alice.user.id, category_id: salary, kind: "income", amount: 1000, occurred_on: "2026-07-10" },
    { user_id: alice.user.id, category_id: food, kind: "expense", amount: 300, occurred_on: "2026-07-28" },
  ]);

  const rows1 = (await alice.client.from("v_monthly_summary").select("*").order("period_month")).data;
  check("รอบ 1: สองรายการอยู่รอบเดียวกัน", rows1.length === 1 && Number(rows1[0].net) === 700,
    JSON.stringify(rows1.map((r) => `${r.period_month}:${r.net}`)));

  await admin.from("profiles").update({ cycle_start_day: 25 }).eq("id", alice.user.id);
  const rows2 = (await alice.client.from("v_monthly_summary").select("*").order("period_month")).data;
  check("รอบ 25: แยกเป็นสองรอบตามวันที่จริง", rows2.length === 2,
    JSON.stringify(rows2.map((r) => `${r.period_month}:${r.net}`)));
  check("  10 ก.ค. ตกรอบ มิ.ย. (+1000)", Number(rows2[0].net) === 1000, rows2[0]?.period_month);
  check("  28 ก.ค. ตกรอบ ก.ค. (-300)", Number(rows2[1].net) === -300, rows2[1]?.period_month);

  // งบยังผูกกับ anchor เดิม ไม่หลุด
  await admin.from("budgets").insert({
    user_id: alice.user.id, category_id: food, kind: "expense", period_month: "2026-07-01", amount: 1000,
  });
  const bu = (await alice.client.from("v_budget_usage").select("*").eq("period_month", "2026-07-01")).data;
  check("เปลี่ยนรอบแล้วงบไม่หลุด และนับยอดตามรอบใหม่", bu.length === 1 && Number(bu[0].spent) === 300,
    `spent=${bu[0]?.spent} pct=${bu[0]?.pct}`);

  await admin.from("profiles").update({ cycle_start_day: 1 }).eq("id", alice.user.id);
}

// ═══════════ constraint ═══════════
console.log("\n--- constraint ---");
{
  const { error } = await alice.client.from("profiles").update({ cycle_start_day: 31 }).eq("id", alice.user.id);
  check("วันเริ่มรอบ 31 → ปฏิเสธ (ก.พ. ไม่มีวันที่ 31)", !!error, error?.message?.slice(0, 45) ?? "หลุด!");
}
{
  const { error } = await alice.client.from("profiles").update({ currency: "XYZ" }).eq("id", alice.user.id);
  check("สกุลเงินที่ไม่รองรับ → ปฏิเสธ", !!error, error?.message?.slice(0, 45) ?? "หลุด!");
}

// ═══════════ RLS ของที่เพิ่มใหม่ ═══════════
console.log("\n--- RLS ของที่เพิ่มใหม่ ---");
{
  const { data } = await bob.client.from("dismissed_alerts").select("*").eq("user_id", alice.user.id);
  check("Bob อ่าน dismissed_alerts ของ Alice → 0 แถว", data?.length === 0, `ได้ ${data?.length}`);
}
{
  const { error } = await bob.client.from("dismissed_alerts").insert({
    user_id: alice.user.id, category_id: id("อาหาร", "expense"), period_month: "2026-07-01", threshold: 80,
  });
  check("Bob ปิดแจ้งเตือนสวมรอย Alice → ปฏิเสธ", !!error, error?.message?.slice(0, 45) ?? "หลุด!");
}
{
  const anon = createClient(SB, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.from("dismissed_alerts").select("*");
  check("anon แตะ dismissed_alerts ไม่ได้", error?.code === "42501" || data?.length === 0,
    error?.code ?? `ได้ ${data?.length}`);
}
{
  // reset_my_categories ไม่รับ argument → ยิงใส่คนอื่นไม่ได้
  const before = (await cats(alice.user)).length;
  const { error } = await bob.client.rpc("reset_my_categories");
  const after = (await cats(alice.user)).length;
  check("Bob เรียก reset_my_categories → กระทบเฉพาะตัวเอง", !error && before === after,
    `หมวด Alice ${before} → ${after}`);
}
{
  const { error } = await bob.client.rpc("seed_default_categories", { target: alice.user.id });
  check("seed_default_categories(uuid คนอื่น) → เรียกไม่ได้", !!error, error?.message?.slice(0, 50) ?? "หลุด!");
}

// ═══════════ ล้างข้อมูล ═══════════
console.log("\n--- ล้างข้อมูล ---");
{
  const { error } = await alice.client.from("transactions").delete();
  check("delete ไม่มี WHERE → PostgREST ปฏิเสธ", error?.code === "21000", error?.code ?? "ลบได้!!");
}
{
  const n0 = (await alice.client.from("transactions").select("*", { count: "exact", head: true })).count;
  // Bob พยายามล้างของ Alice ด้วยเงื่อนไขกว้างสุด
  const { data } = await bob.client.from("transactions").delete().gte("occurred_on", "0001-01-01").select();
  const n1 = (await alice.client.from("transactions").select("*", { count: "exact", head: true })).count;
  check("Bob ล้างทั้งหมด → ไม่แตะข้อมูล Alice", data?.length === 0 && n0 === n1, `Alice ${n0} → ${n1}`);
}

// ═══════════ CSV ไป-กลับ ═══════════
console.log("\n--- CSV ---");
{
  const rows = [
    { occurred_on: "2026-07-01", kind: "expense", category: "อาหาร", amount: 1234.56, note: 'ข้าว, น้ำ "พิเศษ"' },
    { occurred_on: "2026-07-02", kind: "income", category: "เงินเดือน", amount: 32000, note: null },
  ];
  const csv = toCSV(rows);
  check("CSV มี BOM (Excel บน Windows อ่านไทยออก)", csv.startsWith("﻿"));
  const back = parseCSV(csv);
  check("parse กลับได้ครบ ไม่มี error", back.rows.length === 2 && back.errors.length === 0,
    back.errors.join(" | "));
  check("บันทึกย่อที่มีลูกน้ำ+ฟันหนูรอดไป-กลับ", back.rows[0].note === 'ข้าว, น้ำ "พิเศษ"',
    JSON.stringify(back.rows[0].note));
  check("จำนวนเงินไม่เพี้ยน", back.rows[0].amount === 1234.56, String(back.rows[0].amount));

  const csvEN = toCSV(rows, "en");
  const backEN = parseCSV(csvEN, "en");
  check(
    "CSV ภาษาอังกฤษใช้หัวตารางและประเภทรายการภาษาอังกฤษ",
    csvEN.includes("Date,Type,Category,Amount,Note") && csvEN.includes(",Expense,") && csvEN.includes(",Income,"),
  );
  check(
    "CSV ภาษาอังกฤษนำกลับเข้าได้ครบ",
    backEN.rows.length === 2 && backEN.errors.length === 0,
    backEN.errors.join(" | "),
  );
}
{
  const bad = parseCSV("วันที่,ประเภท,หมวดหมู่,จำนวนเงิน,บันทึกย่อ\n2026-13-99,รายจ่าย,อาหาร,100,\nไม่ใช่วันที่,รายจ่าย,อาหาร,50,\n2026-07-01,ขยะ,อาหาร,50,\n2026-07-01,รายจ่าย,อาหาร,-5,\n2026-07-01,รายจ่าย,อาหาร,100,ok");
  check("แถวพังถูกข้ามและรายงานทีละแถว", bad.rows.length === 1 && bad.errors.length === 4,
    `ผ่าน ${bad.rows.length} ข้าม ${bad.errors.length}`);
}
{
  const r = parseCSV("ผิด,หัว,ตาราง\n1,2,3");
  check("หัวตารางผิด → บอกทันที ไม่นำเข้ามั่ว", r.rows.length === 0 && r.errors.length === 1);
  const rEN = parseCSV("wrong,header\n1,2,3", "en");
  check("หัวตารางผิดในโหมดอังกฤษ → แจ้งเป็นอังกฤษ", rEN.errors[0]?.startsWith("The header does not match"));
}

// ═══════════ ลบบัญชี ═══════════
console.log("\n--- ลบบัญชี ---");
{
  const victim = await mk("victim");
  await admin.from("transactions").insert({
    user_id: victim.user.id, category_id: (await cats(victim.user)).find((c) => c.kind === "expense").id,
    kind: "expense", amount: 50, occurred_on: "2026-07-01",
  });

  const { error } = await victim.client.rpc("delete_my_account");
  check("ลบบัญชีตัวเองสำเร็จ", !error, error?.message ?? "");

  const { data: gone } = await admin.auth.admin.listUsers();
  check("user หายจาก auth", !gone.users.some((u) => u.id === victim.user.id));
  const left = await admin.from("transactions").select("*").eq("user_id", victim.user.id);
  check("cascade ลบ transactions ตามไปด้วย", left.data?.length === 0, `เหลือ ${left.data?.length}`);
  const lp = await admin.from("profiles").select("*").eq("id", victim.user.id);
  check("cascade ลบ profile ตามไปด้วย", lp.data?.length === 0);
}
{
  const n0 = (await admin.auth.admin.listUsers()).data.users.length;
  await bob.client.rpc("delete_my_account");
  const users = (await admin.auth.admin.listUsers()).data.users;
  check("Bob ลบบัญชีตัวเอง → Alice ยังอยู่", users.some((u) => u.id === alice.user.id) && users.length === n0 - 1,
    `${n0} → ${users.length}`);
}

console.log(`\n${fail === 0 ? "GATE ผ่าน" : "GATE ไม่ผ่าน"} — pass ${pass} / fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);

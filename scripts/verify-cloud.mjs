/**
 * ตรวจ Supabase cloud ว่าพร้อมให้คนใช้จริง — ยิงผ่าน publishable key อย่างเดียว
 * เหมือนที่เบราว์เซอร์ทำ ไม่ใช้ service_role เพราะ key นั้นข้าม RLS
 * จะทดสอบไม่เจอสิ่งที่ต้องการทดสอบพอดี
 *
 * สร้างบัญชีทดสอบ 2 บัญชีบน project จริง แล้วลบทิ้งด้วย delete_my_account()
 * ตอนจบ (ซึ่งเป็นการทดสอบ cascade ไปในตัว) ถ้าสคริปต์ตายกลางทาง อาจมีบัญชี
 * ชื่อ verify-*@rairap-test.dev ค้าง ลบได้ที่ Dashboard → Authentication
 *
 *   node scripts/verify-cloud.mjs
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = new URL("../.env.local", import.meta.url);
const raw = fs.readFileSync(envFile, "utf8");
const read = (n) => raw.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1]?.trim();

const URL_ = read("NEXT_PUBLIC_SUPABASE_URL");
const KEY =
  read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
  read("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!URL_ || !KEY) {
  console.error("อ่านค่าจาก .env.local ไม่ได้");
  process.exit(1);
}
if (URL_.includes("127.0.0.1") || URL_.includes("localhost")) {
  console.error(".env.local ชี้ Supabase ในเครื่อง — สคริปต์นี้มีไว้ตรวจ cloud");
  process.exit(1);
}

let pass = 0;
let fail = 0;
const check = (n, ok, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
  if (ok) { pass++; } else { fail++; }
};

const anon = () => createClient(URL_, KEY, { auth: { persistSession: false } });
const stamp = Date.now();

console.log(`ตรวจ ${URL_}\n`);

// ── ยังไม่ล็อกอิน ต้องแตะอะไรไม่ได้เลย ──
console.log("--- ยังไม่ล็อกอิน ---");
for (const rel of ["transactions", "categories", "profiles", "budgets", "accounts", "v_monthly_summary"]) {
  const { data, error } = await anon().from(rel).select("*");
  const blocked = error?.code === "42501" || data?.length === 0;
  check(`anon อ่าน ${rel} ไม่ได้`, blocked, error?.code ?? `ได้ ${data?.length} แถว`);
}

// ── สมัคร 2 บัญชี ──
console.log("\n--- สมัครบัญชี ---");
const signUp = async (tag) => {
  const c = anon();
  const email = `verify-${tag}-${stamp}@rairap-test.dev`;
  const password = `Vf-${stamp}-${tag}!x`;
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { data: { display_name: `ทดสอบ ${tag}` } },
  });
  return { c, email, password, user: data?.user, session: data?.session, error };
};

const a = await signUp("a");
if (a.error) {
  check("สมัครบัญชีแรกได้", false, a.error.message);
  console.log(`\nGATE ไม่ผ่าน — pass ${pass} / fail ${fail + 1}`);
  process.exit(1);
}
check("สมัครบัญชีแรกได้", !!a.user, a.user?.id?.slice(0, 8));

if (!a.session) {
  console.log("\n  ยืนยันอีเมลเปิดอยู่ → สมัครแล้วยังไม่ได้ session");
  console.log("  ตรวจส่วนที่เหลือต่อไม่ได้ถ้าไม่ยืนยันอีเมลก่อน");
  console.log("  (เปิดยืนยันอีเมลไว้เป็นเรื่องถูกต้อง — ปิดแล้วใครก็สมัครด้วยอีเมลคนอื่นได้)");
  console.log(`\nตรวจได้เท่านี้ — pass ${pass} / fail ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

const b = await signUp("b");
check("สมัครบัญชีที่สองได้", !!b.session, b.error?.message ?? "");

// ── trigger ──
console.log("\n--- trigger ตอนสมัคร ---");
{
  const { data } = await a.c.from("profiles").select("*");
  check("สร้าง profile ให้อัตโนมัติ", data?.length === 1, `เห็น ${data?.length} แถว`);
  const { data: cats } = await a.c.from("categories").select("*");
  check("seed หมวดเริ่มต้น 10 หมวด", cats?.length === 10, `เห็น ${cats?.length} หมวด`);
}

// ── ใส่ข้อมูลให้ a ──
const { data: aCats } = await a.c.from("categories").select("*").eq("kind", "expense");
const food = aCats?.find((c) => c.name === "อาหาร");
{
  const { error } = await a.c.from("transactions").insert({
    user_id: a.user.id, category_id: food.id, kind: "expense",
    amount: 123.45, occurred_on: "2026-07-17", note: "ข้อมูลลับของ a",
  });
  check("a เพิ่มรายการของตัวเองได้", !error, error?.message ?? "");
}

// ══════════ ข้อที่สำคัญที่สุด ══════════
console.log("\n--- b ต้องแตะข้อมูล a ไม่ได้ (ข้อสำคัญที่สุด) ---");
{
  const { data } = await b.c.from("transactions").select("*");
  check("b อ่าน transactions ทั้งหมด → 0 แถว", data?.length === 0, `ได้ ${data?.length}`);
}
{
  const { data } = await b.c.from("transactions").select("*").eq("user_id", a.user.id);
  check("b ระบุ user_id ของ a ตรง ๆ → 0 แถว", data?.length === 0, `ได้ ${data?.length}`);
}
{
  const { data } = await b.c.from("profiles").select("*").eq("id", a.user.id);
  check("b อ่าน profile ของ a → 0 แถว", data?.length === 0, `ได้ ${data?.length}`);
}
{
  const { error } = await b.c.from("transactions").insert({
    user_id: a.user.id, category_id: food.id, kind: "expense",
    amount: 999, occurred_on: "2026-07-17",
  });
  check("b เขียนสวมรอย a → ถูกปฏิเสธ", !!error, error?.message?.slice(0, 40) ?? "ไม่ error = ช่องโหว่!");
}
{
  const { data } = await b.c.from("transactions").update({ amount: 1 }).eq("user_id", a.user.id).select();
  check("b แก้รายการ a → ไม่โดนแถวไหน", data?.length === 0, `แก้ได้ ${data?.length}`);
}
{
  const { data } = await b.c.from("transactions").delete().gte("occurred_on", "0001-01-01").select();
  const { count } = await a.c.from("transactions").select("*", { count: "exact", head: true });
  check("b ล้างข้อมูลทั้งหมด → ของ a ยังอยู่", data?.length === 0 && count === 1, `a เหลือ ${count}`);
}
for (const v of ["v_monthly_summary", "v_running_balance", "v_budget_usage"]) {
  const { data, error } = await b.c.from(v).select("*");
  check(`b อ่าน ${v} → 0 แถว (view ไม่เป็นประตูหลัง)`, !error && data?.length === 0,
    error?.message ?? `ได้ ${data?.length}`);
}

// ── TRUNCATE ต้องถูกถอด ──
console.log("\n--- สิทธิ์ที่ต้องไม่มี ---");
{
  const { error } = await b.c.rpc("seed_default_categories", { target: a.user.id });
  check("เรียก seed_default_categories ใส่คนอื่นไม่ได้", !!error, error?.code ?? "หลุด!");
}

// ── ใบเสร็จ ──
console.log("\n--- ใบเสร็จ (storage) ---");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
{
  const { error } = await a.c.storage.from("receipts")
    .upload(`${a.user.id}/t.png`, png, { contentType: "image/png", upsert: true });
  if (error?.message?.match(/not found|Bucket/i)) {
    check("bucket receipts มีอยู่", false, "ยังไม่ได้สร้าง bucket — Dashboard → Storage → New bucket");
  } else {
    check("a อัปโหลดใบเสร็จของตัวเองได้", !error, error?.message ?? "");

    const { error: e2 } = await b.c.storage.from("receipts")
      .upload(`${a.user.id}/แอบ.png`, png, { contentType: "image/png" });
    check("b อัปเข้าโฟลเดอร์ a → ปฏิเสธ", !!e2, e2?.message?.slice(0, 36) ?? "หลุด!!");

    const { data: dl, error: e3 } = await b.c.storage.from("receipts").download(`${a.user.id}/t.png`);
    check("b โหลดใบเสร็จ a → ไม่ได้", !!e3 || !dl, e3?.message?.slice(0, 36) ?? "โหลดได้!!");

    const { data: pub } = a.c.storage.from("receipts").getPublicUrl(`${a.user.id}/t.png`);
    const res = await fetch(pub.publicUrl);
    check("bucket ไม่ public (URL ตรงเปิดไม่ได้)", !res.ok, `HTTP ${res.status}`);

    const { data: signed } = await a.c.storage.from("receipts").createSignedUrl(`${a.user.id}/t.png`, 60);
    const r2 = signed ? await fetch(signed.signedUrl) : null;
    check("เจ้าของเปิดผ่าน signed URL ได้", !!r2?.ok, `HTTP ${r2?.status}`);

    await a.c.storage.from("receipts").remove([`${a.user.id}/t.png`]);
  }
}

// ── เก็บกวาด (และทดสอบ cascade ไปในตัว) ──
console.log("\n--- ลบบัญชีทดสอบทิ้ง ---");
{
  const { error } = await a.c.rpc("delete_my_account");
  check("a ลบบัญชีตัวเองได้", !error, error?.message ?? "");
  const { error: e2 } = await b.c.rpc("delete_my_account");
  check("b ลบบัญชีตัวเองได้", !e2, e2?.message ?? "");

  const c = anon();
  const { error: e3 } = await c.auth.signInWithPassword({ email: a.email, password: a.password });
  check("ลบแล้วล็อกอินไม่ได้อีก", !!e3, e3?.message?.slice(0, 30) ?? "ยังเข้าได้!");
}

console.log(`\n${fail === 0 ? "cloud พร้อมใช้งาน" : "ยังมีปัญหา"} — pass ${pass} / fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);

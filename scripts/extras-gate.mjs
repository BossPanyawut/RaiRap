import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-only.mjs";

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
const aCats = (await admin.from("categories").select("*").eq("user_id", alice.user.id)).data;
const id = (n, k) => aCats.find((c) => c.name === n && c.kind === k).id;

// ═══════════ รายการเกิดซ้ำ ═══════════
console.log("--- รายการเกิดซ้ำ ---");
{
  const { data: rule, error } = await alice.client.from("recurring_rules").insert({
    user_id: alice.user.id, category_id: id("ที่พัก", "expense"), kind: "expense",
    amount: 7500, note: "ค่าเช่าห้อง", freq: "monthly", every: 1, starts_on: "2026-01-05",
  }).select().single();
  check("สร้างกฎรายเดือนได้", !error, error?.message ?? "");

  const { data: n1 } = await alice.client.rpc("materialize_recurring", { until: "2026-07-17" });
  check("สร้างงวดย้อนหลัง ม.ค.–ก.ค. = 7 งวด", n1 === 7, `ได้ ${n1}`);

  // เรียกซ้ำต้องไม่เกิดรายการซ้ำ — หัวใจของ unique(rule_id, occurred_on)
  const { data: n2 } = await alice.client.rpc("materialize_recurring", { until: "2026-07-17" });
  check("เรียกซ้ำ → ไม่สร้างซ้ำ (idempotent)", n2 === 0, `ได้ ${n2}`);

  const { count } = await alice.client.from("transactions")
    .select("*", { count: "exact", head: true }).eq("recurring_rule_id", rule.id);
  check("มีรายการจากกฎนี้ 7 รายการพอดี", count === 7, `ได้ ${count}`);

  const { data: rows } = await alice.client.from("transactions")
    .select("occurred_on").eq("recurring_rule_id", rule.id).order("occurred_on");
  check("ทุกงวดตกวันที่ 5", rows.every((r) => r.occurred_on.endsWith("-05")),
    rows.map((r) => r.occurred_on).join(" "));

  // ขยับเวลาไปข้างหน้า → เพิ่มเฉพาะงวดใหม่
  const { data: n3 } = await alice.client.rpc("materialize_recurring", { until: "2026-09-17" });
  check("เลื่อนไป ก.ย. → เพิ่มอีก 2 งวด", n3 === 2, `ได้ ${n3}`);

  await alice.client.from("recurring_rules").update({ is_paused: true }).eq("id", rule.id);
  const { data: n4 } = await alice.client.rpc("materialize_recurring", { until: "2026-12-17" });
  check("หยุดกฎแล้ว → ไม่สร้างเพิ่ม", n4 === 0, `ได้ ${n4}`);
  await alice.client.from("recurring_rules").delete().eq("id", rule.id);
}
{
  const { data: rule } = await alice.client.from("recurring_rules").insert({
    user_id: alice.user.id, category_id: id("บันเทิง", "expense"), kind: "expense",
    amount: 349, freq: "monthly", every: 1, starts_on: "2026-01-10", ends_on: "2026-03-10",
  }).select().single();
  const { data: n } = await alice.client.rpc("materialize_recurring", { until: "2026-12-31" });
  check("กฎที่มีวันจบ → หยุดตาม ends_on (3 งวด)", n === 3, `ได้ ${n}`);
  await alice.client.from("recurring_rules").delete().eq("id", rule.id);
}
{
  const { error } = await alice.client.from("recurring_rules").insert({
    user_id: alice.user.id, category_id: id("เงินเดือน", "income"), kind: "expense",
    amount: 100, freq: "monthly", starts_on: "2026-01-01",
  });
  check("kind ไม่ตรงหมวด → composite FK ปฏิเสธ", !!error, error?.code ?? "หลุด!");
}
{
  const { error } = await alice.client.from("recurring_rules").insert({
    user_id: alice.user.id, category_id: id("อาหาร", "expense"), kind: "expense",
    amount: 100, freq: "monthly", starts_on: "2026-06-01", ends_on: "2026-01-01",
  });
  check("วันจบก่อนวันเริ่ม → ปฏิเสธ", !!error, error?.code ?? "หลุด!");
}
{
  const n0 = (await alice.client.from("transactions").select("*", { count: "exact", head: true })).count;
  const { data: n } = await bob.client.rpc("materialize_recurring", { until: "2026-12-31" });
  const n1 = (await alice.client.from("transactions").select("*", { count: "exact", head: true })).count;
  check("Bob เรียก materialize → ไม่แตะข้อมูล Alice", n === 0 && n0 === n1, `Alice ${n0} → ${n1}`);
}

// ═══════════ บัญชี / กระเป๋าเงิน ═══════════
console.log("\n--- บัญชี ---");
{
  const { data: acc } = await alice.client.from("accounts").insert([
    { user_id: alice.user.id, name: "เงินสด", kind: "cash" },
    { user_id: alice.user.id, name: "บัตรเครดิต", kind: "credit" },
  ]).select();
  check("สร้างบัญชีได้", acc?.length === 2);

  await alice.client.from("transactions").insert([
    { user_id: alice.user.id, category_id: id("เงินเดือน", "income"), kind: "income",
      amount: 30000, occurred_on: "2026-07-01", account_id: acc[0].id },
    { user_id: alice.user.id, category_id: id("อาหาร", "expense"), kind: "expense",
      amount: 500, occurred_on: "2026-07-02", account_id: acc[0].id },
    { user_id: alice.user.id, category_id: id("ช้อปปิ้ง", "expense"), kind: "expense",
      amount: 1200, occurred_on: "2026-07-03", account_id: acc[1].id },
  ]);

  const { data: bal } = await alice.client.from("v_account_balance")
    .select("*").order("name");
  const cash = bal.find((b) => b.name === "เงินสด");
  const credit = bal.find((b) => b.name === "บัตรเครดิต");
  check("ยอดแยกตามบัญชีถูก", Number(cash.balance) === 29500 && Number(credit.balance) === -1200,
    `เงินสด=${cash.balance} บัตร=${credit.balance}`);

  const { data: bobSees } = await bob.client.from("v_account_balance").select("*");
  check("Bob ไม่เห็นบัญชีของ Alice", bobSees?.length === 0, `ได้ ${bobSees?.length}`);

  const { error } = await bob.client.from("accounts").insert({
    user_id: alice.user.id, name: "แอบใส่", kind: "cash",
  });
  check("Bob สร้างบัญชีสวมรอย Alice → ปฏิเสธ", !!error, error?.code ?? "หลุด!");

  // ลบบัญชี → รายการต้องไม่หาย แค่หลุดจากบัญชี
  const n0 = (await alice.client.from("transactions").select("*", { count: "exact", head: true })).count;
  await alice.client.from("accounts").delete().eq("id", acc[1].id);
  const n1 = (await alice.client.from("transactions").select("*", { count: "exact", head: true })).count;
  const { data: orphan } = await alice.client.from("transactions")
    .select("account_id").eq("amount", 1200).single();
  check("ลบบัญชี → รายการยังอยู่ แค่ account_id เป็น null", n0 === n1 && orphan.account_id === null,
    `${n0} → ${n1}`);
}

// ═══════════ เป้าหมายการออม ═══════════
console.log("\n--- เป้าหมายการออม ---");
{
  const { error } = await alice.client.from("saving_goals").insert({
    user_id: alice.user.id, name: "ทริปญี่ปุ่น", target_amount: 60000, target_date: "2027-03-01",
  });
  check("สร้างเป้าหมายได้", !error, error?.message ?? "");

  const { error: e2 } = await alice.client.from("saving_goals").insert({
    user_id: alice.user.id, name: "ติดลบ", target_amount: -100,
  });
  check("เป้าหมายติดลบ → ปฏิเสธ", !!e2, e2?.code ?? "หลุด!");

  const { data } = await bob.client.from("saving_goals").select("*").eq("user_id", alice.user.id);
  check("Bob ไม่เห็นเป้าหมายของ Alice", data?.length === 0, `ได้ ${data?.length}`);
}

// ═══════════ ใบเสร็จ / Storage ═══════════
console.log("\n--- ใบเสร็จ (storage) ---");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
{
  const path = `${alice.user.id}/test.png`;
  const { error } = await alice.client.storage.from("receipts")
    .upload(path, png, { contentType: "image/png", upsert: true });
  check("Alice อัปโหลดเข้าโฟลเดอร์ตัวเองได้", !error, error?.message ?? "");
}
{
  // หัวใจของ policy: โฟลเดอร์แรกต้องเป็น uid ของคนอัปโหลด
  const { error } = await bob.client.storage.from("receipts")
    .upload(`${alice.user.id}/แอบใส่.png`, png, { contentType: "image/png" });
  check("Bob อัปโหลดเข้าโฟลเดอร์ Alice → ปฏิเสธ", !!error, error?.message?.slice(0, 40) ?? "หลุด!!");
}
{
  const { data, error } = await bob.client.storage.from("receipts")
    .download(`${alice.user.id}/test.png`);
  check("Bob โหลดใบเสร็จของ Alice → ไม่ได้", !!error || !data, error?.message?.slice(0, 40) ?? "โหลดได้!!");
}
{
  const { data } = await bob.client.storage.from("receipts").list(alice.user.id);
  check("Bob list โฟลเดอร์ Alice → ว่าง", !data || data.length === 0, `ได้ ${data?.length}`);
}
{
  const anon = createClient(SB, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.storage.from("receipts").download(`${alice.user.id}/test.png`);
  check("ไม่ล็อกอิน โหลดใบเสร็จ → ไม่ได้", !!error || !data, error?.message?.slice(0, 40) ?? "โหลดได้!!");
}
{
  const { data: pub } = alice.client.storage.from("receipts").getPublicUrl(`${alice.user.id}/test.png`);
  const res = await fetch(pub.publicUrl);
  check("URL แบบ public เปิดไม่ได้ (bucket ต้องไม่ public)", !res.ok, `HTTP ${res.status}`);
}
{
  const { data, error } = await alice.client.storage.from("receipts")
    .createSignedUrl(`${alice.user.id}/test.png`, 60);
  const res = data ? await fetch(data.signedUrl) : null;
  check("เจ้าของขอ signed URL แล้วเปิดได้", !error && res?.ok, error?.message ?? `HTTP ${res?.status}`);
}
{
  const { error } = await bob.client.storage.from("receipts")
    .remove([`${alice.user.id}/test.png`]);
  const { data: still } = await alice.client.storage.from("receipts").list(alice.user.id);
  check("Bob ลบใบเสร็จ Alice → ไฟล์ยังอยู่", still?.some((f) => f.name === "test.png"),
    error?.message?.slice(0, 30) ?? "");
}

console.log(`\n${fail === 0 ? "GATE ผ่าน" : "GATE ไม่ผ่าน"} — pass ${pass} / fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);

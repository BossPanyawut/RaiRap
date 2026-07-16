"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_CYCLE_DAY, MIN_CYCLE_DAY } from "@/lib/dates";
import { CURRENCIES } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type State = { error: string } | { ok: string } | null;

function revalidateAll() {
  for (const p of ["/", "/transactions", "/budgets", "/analytics", "/categories", "/settings"]) {
    revalidatePath(p);
  }
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ────────────────────────────── โปรไฟล์ ──────────────────────────────

const profileInput = z.object({
  displayName: z.string().trim().min(1, "ใส่ชื่อที่อยากให้เรียก").max(60, "ชื่อยาวเกิน 60 ตัว"),
  currency: z.enum(Object.keys(CURRENCIES) as [string, ...string[]]),
  cycleStartDay: z.coerce
    .number()
    .int("วันเริ่มรอบต้องเป็นจำนวนเต็ม")
    .min(MIN_CYCLE_DAY, `วันเริ่มรอบต้องอยู่ระหว่าง ${MIN_CYCLE_DAY}–${MAX_CYCLE_DAY}`)
    .max(MAX_CYCLE_DAY, `เลือกได้ถึงวันที่ ${MAX_CYCLE_DAY} เท่านั้น เพราะทุกเดือนมีวันที่ ${MAX_CYCLE_DAY} เสมอ`),
});

export async function updateProfile(_prev: State, formData: FormData): Promise<State> {
  const parsed = profileInput.safeParse({
    displayName: formData.get("displayName"),
    currency: formData.get("currency"),
    cycleStartDay: formData.get("cycleStartDay"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      currency: parsed.data.currency,
      cycle_start_day: parsed.data.cycleStartDay,
    })
    .eq("id", user.id);
  if (error) return { error: "บันทึกไม่สำเร็จ ลองอีกครั้ง" };

  revalidateAll();
  return { ok: "บันทึกแล้ว" };
}

// ────────────────────────────── รหัสผ่าน ──────────────────────────────

const passwordInput = z
  .object({
    current: z.string().min(1, "ใส่รหัสผ่านปัจจุบัน"),
    next: z.string().min(8, "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัว"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    error: "รหัสผ่านใหม่สองช่องไม่ตรงกัน",
    path: ["confirm"],
  });

export async function changePassword(_prev: State, formData: FormData): Promise<State> {
  const parsed = passwordInput.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { supabase, user } = await requireUser();
  if (!user?.email) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  // ตรวจรหัสเดิมก่อนเสมอ — Supabase ไม่บังคับ แต่ถ้าไม่ตรวจ ใครยืมเครื่องที่
  // เปิดค้างไว้เปลี่ยนรหัสยึดบัญชีได้ทันที
  const { error: reauth } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (reauth) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) return { error: "เปลี่ยนรหัสผ่านไม่สำเร็จ ลองอีกครั้ง" };

  revalidatePath("/settings");
  return { ok: "เปลี่ยนรหัสผ่านแล้ว" };
}

// ────────────────────────────── อีเมล ──────────────────────────────

export async function changeEmail(_prev: State, formData: FormData): Promise<State> {
  const parsed = z
    .object({ email: z.email("อีเมลไม่ถูกต้อง"), current: z.string().min(1, "ใส่รหัสผ่าน") })
    .safeParse({ email: formData.get("email"), current: formData.get("current") });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { supabase, user } = await requireUser();
  if (!user?.email) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };
  if (parsed.data.email === user.email) return { error: "อีเมลนี้คืออีเมลปัจจุบันอยู่แล้ว" };

  const { error: reauth } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (reauth) return { error: "รหัสผ่านไม่ถูกต้อง" };

  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return { error: "ส่งลิงก์ยืนยันไม่สำเร็จ ลองอีกครั้ง" };

  revalidatePath("/settings");
  return {
    ok: `ส่งลิงก์ยืนยันไปที่ ${user.email} และ ${parsed.data.email} แล้ว ต้องกดยืนยันทั้งสองฉบับ อีเมลถึงจะเปลี่ยน`,
  };
}

// ────────────────────────────── หมวดหมู่ ──────────────────────────────

export async function resetCategories(): Promise<State> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  // ฟังก์ชันใน DB ไม่รับ argument และอ่าน auth.uid() เอง → ส่ง id คนอื่นเข้าไปไม่ได้
  const { error } = await supabase.rpc("reset_my_categories");
  if (error) return { error: "รีเซ็ตหมวดหมู่ไม่สำเร็จ ลองอีกครั้ง" };

  revalidateAll();
  return { ok: "เพิ่มหมวดหมู่เริ่มต้นที่ขาดกลับมาแล้ว หมวดที่คุณสร้างเองไม่ถูกแตะ" };
}

// ────────────────────────────── ล้างข้อมูล ──────────────────────────────

const wipeInput = z.object({
  scope: z.enum(["all", "period", "range"]),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  alsoBudgets: z.coerce.boolean().default(false),
  confirm: z.string(),
  expected: z.coerce.number().int().nonnegative(),
});

export async function wipeTransactions(_prev: State, formData: FormData): Promise<State> {
  const parsed = wipeInput.safeParse({
    scope: formData.get("scope"),
    from: formData.get("from") || undefined,
    to: formData.get("to") || undefined,
    alsoBudgets: formData.get("alsoBudgets") === "on",
    confirm: formData.get("confirm"),
    expected: formData.get("expected"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { scope, from, to, alsoBudgets, confirm, expected } = parsed.data;

  if (expected === 0) return { error: "ไม่มีรายการให้ลบในช่วงที่เลือก" };

  // ให้พิมพ์จำนวนรายการที่จะหาย ไม่ใช่กดปุ่ม "แน่ใจไหม" ซึ่งกดผ่านได้โดยไม่อ่าน
  // การพิมพ์ตัวเลขบังคับให้ตาไปอยู่ที่จำนวนจริงก่อนลบ
  if (confirm.trim() !== String(expected)) {
    return { error: `พิมพ์ ${expected} ในช่องยืนยันเพื่อยืนยันว่าจะลบ ${expected} รายการ` };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  if (scope !== "all" && (!from || !to)) return { error: "เลือกช่วงวันที่ให้ครบ" };

  // PostgREST ปฏิเสธ DELETE ที่ไม่มี WHERE (21000) — "ทั้งหมด" จึงต้องมีเงื่อนไข
  // ที่จริงเสมอ ไม่ใช่ .delete() เปล่า ๆ. RLS จำกัดให้เหลือแถวของเจ้าของอยู่แล้ว
  let del = supabase.from("transactions").delete();
  del = scope === "all" ? del.gte("occurred_on", "0001-01-01") : del.gte("occurred_on", from!).lte("occurred_on", to!);

  const { data: deleted, error } = await del.select("id");
  if (error) return { error: "ลบไม่สำเร็จ ลองอีกครั้ง" };

  let budgetsRemoved = 0;
  if (alsoBudgets) {
    let bdel = supabase.from("budgets").delete();
    bdel =
      scope === "all"
        ? bdel.gte("period_month", "0001-01-01")
        : bdel.gte("period_month", `${from!.slice(0, 7)}-01`).lte("period_month", `${to!.slice(0, 7)}-01`);
    const { data: bd } = await bdel.select("id");
    budgetsRemoved = bd?.length ?? 0;
  }

  revalidateAll();
  return {
    ok: `ลบ ${deleted?.length ?? 0} รายการแล้ว${budgetsRemoved ? ` และลบงบ ${budgetsRemoved} รายการ` : ""}`,
  };
}

// ────────────────────────────── ลบบัญชี ──────────────────────────────

export async function deleteAccount(_prev: State, formData: FormData): Promise<State> {
  const parsed = z
    .object({ current: z.string().min(1, "ใส่รหัสผ่าน"), confirm: z.string() })
    .safeParse({ current: formData.get("current"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { supabase, user } = await requireUser();
  if (!user?.email) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  if (parsed.data.confirm.trim() !== user.email) {
    return { error: `พิมพ์ ${user.email} ในช่องยืนยัน` };
  }

  const { error: reauth } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (reauth) return { error: "รหัสผ่านไม่ถูกต้อง" };

  // ทุกตารางอ้าง auth.users(id) on delete cascade → เรียกครั้งเดียวหายหมด
  // ในทรานแซกชันเดียว ไม่ต้องไล่ลบทีละตารางแล้วเสี่ยงค้างครึ่ง ๆ กลาง ๆ
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "ลบบัญชีไม่สำเร็จ ลองอีกครั้ง" };

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type RecurringState = { error: string } | { ok: string } | null;

export const FREQ_LABELS = {
  daily: "วัน",
  weekly: "สัปดาห์",
  monthly: "เดือน",
  yearly: "ปี",
} as const;

const ruleInput = z.object({
  categoryId: z.uuid("เลือกหมวดหมู่"),
  accountId: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
  amount: z.coerce.number("ใส่จำนวนเงิน").positive("จำนวนเงินต้องมากกว่า 0").max(9_999_999_999.99),
  note: z.string().trim().max(200).optional(),
  freq: z.enum(["daily", "weekly", "monthly", "yearly"]),
  every: z.coerce.number().int().min(1, "ต้องมากกว่า 0").max(99, "มากเกินไป"),
  startsOn: z.iso.date("วันที่เริ่มไม่ถูกต้อง"),
  endsOn: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
});

function revalidate() {
  for (const p of ["/", "/recurring", "/transactions", "/budgets", "/analytics"]) {
    revalidatePath(p);
  }
}

export async function createRule(
  _prev: RecurringState,
  formData: FormData,
): Promise<RecurringState> {
  const parsed = ruleInput.safeParse({
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId") ?? "",
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
    freq: formData.get("freq"),
    every: formData.get("every"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn") ?? "",
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const d = parsed.data;
  if (d.endsOn && d.endsOn < d.startsOn) return { error: "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  // อ่าน kind จากหมวดจริง ไม่รับจากฟอร์ม — ผู้ใช้แก้ค่าใน DOM ได้
  const { data: category } = await supabase
    .from("categories")
    .select("kind")
    .eq("id", d.categoryId)
    .single();
  if (!category) return { error: "ไม่พบหมวดหมู่นี้" };

  const { error } = await supabase.from("recurring_rules").insert({
    user_id: user.id,
    category_id: d.categoryId,
    kind: category.kind,
    account_id: d.accountId,
    amount: d.amount,
    note: d.note ?? null,
    freq: d.freq,
    every: d.every,
    starts_on: d.startsOn,
    ends_on: d.endsOn,
  });
  if (error) return { error: "สร้างกฎไม่สำเร็จ ลองอีกครั้ง" };

  // สร้างงวดที่ถึงกำหนดแล้วให้ทันที ไม่ต้องรอผู้ใช้โหลดหน้าใหม่
  const { data: made } = await supabase.rpc("materialize_recurring");
  revalidate();
  return {
    ok: made ? `สร้างกฎแล้ว และเพิ่มรายการย้อนหลังให้ ${made} รายการ` : "สร้างกฎแล้ว",
  };
}

export async function togglePause(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  const paused = formData.get("paused") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("recurring_rules").update({ is_paused: !paused }).eq("id", id.data);
  if (paused) await supabase.rpc("materialize_recurring");
  revalidate();
}

/**
 * ลบกฎ ไม่ลบรายการที่สร้างไปแล้ว — transactions.recurring_rule_id เป็น
 * on delete set null รายการที่เกิดขึ้นจริงในอดีตยังเป็นประวัติที่ถูกต้อง
 */
export async function deleteRule(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("recurring_rules").delete().eq("id", id.data);
  revalidate();
}

export async function runNow(): Promise<RecurringState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("materialize_recurring");
  if (error) return { error: "สร้างรายการไม่สำเร็จ ลองอีกครั้ง" };
  revalidate();
  return { ok: data ? `เพิ่ม ${data} รายการ` : "ไม่มีงวดที่ค้างอยู่" };
}

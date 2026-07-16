"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string } | { ok: true } | null;

const transactionInput = z.object({
  categoryId: z.uuid("เลือกหมวดหมู่"),
  amount: z.coerce
    .number("ใส่จำนวนเงิน")
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(9_999_999_999.99, "จำนวนเงินเกินที่ระบบเก็บได้"),
  occurredOn: z.iso.date("วันที่ไม่ถูกต้อง"),
  note: z.string().trim().max(200, "บันทึกย่อยาวเกิน 200 ตัว").optional(),
});

function parse(formData: FormData) {
  return transactionInput.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    note: formData.get("note") || undefined,
  });
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/analytics");
}

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  // อ่าน kind จากหมวดจริงเสมอ ไม่รับค่าจากฟอร์ม — ผู้ใช้แก้ค่าใน DOM ได้
  // (select นี้ผ่าน RLS อยู่แล้ว จึงอ้างหมวดของคนอื่นไม่ได้)
  const { data: category } = await supabase
    .from("categories")
    .select("kind")
    .eq("id", parsed.data.categoryId)
    .single();
  if (!category) return { error: "ไม่พบหมวดหมู่นี้" };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    kind: category.kind,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    note: parsed.data.note ?? null,
  });
  if (error) return { error: "บันทึกไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

export async function updateTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ไม่พบรายการนี้" };

  const parsed = parse(formData);
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("kind")
    .eq("id", parsed.data.categoryId)
    .single();
  if (!category) return { error: "ไม่พบหมวดหมู่นี้" };

  // ไม่ต้องกรอง user_id เอง — RLS ทำให้แถวของคนอื่นไม่เข้าเงื่อนไขอยู่แล้ว
  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: parsed.data.categoryId,
      kind: category.kind,
      amount: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      note: parsed.data.note ?? null,
    })
    .eq("id", id.data);
  if (error) return { error: "แก้ไขไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id.data);
  revalidate();
}

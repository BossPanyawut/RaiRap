"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { shiftPeriod } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type BudgetState = { error: string } | { ok: true } | null;

const periodSchema = z.iso
  .date()
  .refine((d) => d.endsWith("-01"), "งบผูกกับเดือน ต้องเป็นวันที่ 1");

const budgetInput = z.object({
  categoryId: z.uuid(),
  period: periodSchema,
  // ปล่อยว่าง = ไม่ตั้งงบหมวดนี้ ต่างจากตั้งงบ 0 ซึ่งแปลว่า "ห้ามใช้เลย"
  amount: z
    .union([z.literal(""), z.coerce.number().nonnegative("งบติดลบไม่ได้")])
    .transform((v) => (v === "" ? null : v)),
});

function revalidate() {
  revalidatePath("/");
  revalidatePath("/budgets");
}

export async function setBudget(
  _prev: BudgetState,
  formData: FormData,
): Promise<BudgetState> {
  const parsed = budgetInput.safeParse({
    categoryId: formData.get("categoryId"),
    period: formData.get("period"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const { categoryId, period, amount } = parsed.data;

  if (amount === null) {
    await supabase
      .from("budgets")
      .delete()
      .eq("category_id", categoryId)
      .eq("period_month", period);
    revalidate();
    return { ok: true };
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category_id: categoryId,
      kind: "expense",
      period_month: period,
      amount,
    },
    { onConflict: "user_id,category_id,period_month" },
  );
  if (error) return { error: "ตั้งงบไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

export async function copyLastMonth(
  _prev: BudgetState,
  formData: FormData,
): Promise<BudgetState> {
  const period = periodSchema.safeParse(formData.get("period"));
  if (!period.success) return { error: "เดือนไม่ถูกต้อง" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const previous = shiftPeriod(period.data, -1);
  const { data: rows } = await supabase
    .from("budgets")
    .select("category_id, amount")
    .eq("period_month", previous);

  if (!rows?.length) return { error: "เดือนก่อนหน้ายังไม่ได้ตั้งงบไว้" };

  const { error } = await supabase.from("budgets").upsert(
    rows.map((r) => ({
      user_id: user.id,
      category_id: r.category_id,
      kind: "expense" as const,
      period_month: period.data,
      amount: r.amount,
    })),
    { onConflict: "user_id,category_id,period_month" },
  );
  if (error) return { error: "คัดลอกงบไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

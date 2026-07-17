"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type GoalState = { error: string } | { ok: true } | null;

const goalInput = z.object({
  name: z.string().trim().min(1, "ใส่ชื่อเป้าหมาย").max(60, "ชื่อยาวเกิน 60 ตัว"),
  targetAmount: z.coerce
    .number("ใส่จำนวนเงิน")
    .positive("เป้าหมายต้องมากกว่า 0")
    .max(9_999_999_999.99, "จำนวนเงินเกินที่ระบบเก็บได้"),
  targetDate: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
});

function revalidate() {
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function createGoal(_prev: GoalState, formData: FormData): Promise<GoalState> {
  const parsed = goalInput.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") ?? "",
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const { error } = await supabase.from("saving_goals").insert({
    user_id: user.id,
    name: parsed.data.name,
    target_amount: parsed.data.targetAmount,
    target_date: parsed.data.targetDate,
  });

  if (error?.code === "23505") return { error: "มีเป้าหมายชื่อนี้อยู่แล้ว" };
  if (error) return { error: "สร้างเป้าหมายไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

export async function deleteGoal(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("saving_goals").delete().eq("id", id.data);
  revalidate();
}

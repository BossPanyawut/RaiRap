"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CategoryState = { error: string } | { ok: true } | null;

const categoryInput = z.object({
  name: z.string().trim().min(1, "ใส่ชื่อหมวดหมู่").max(40, "ชื่อยาวเกิน 40 ตัว"),
  kind: z.enum(["income", "expense"]),
});

function revalidate() {
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

export async function createCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const parsed = categoryInput.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    sort_order: 50,
  });

  // unique (user_id, name, kind)
  if (error?.code === "23505") return { error: "มีหมวดนี้อยู่แล้ว" };
  if (error) return { error: "เพิ่มหมวดไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

export async function renameCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const id = z.uuid().safeParse(formData.get("id"));
  const name = z
    .string()
    .trim()
    .min(1, "ใส่ชื่อหมวดหมู่")
    .max(40)
    .safeParse(formData.get("name"));
  if (!id.success || !name.success) return { error: "ชื่อหมวดไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: name.data })
    .eq("id", id.data);

  if (error?.code === "23505") return { error: "มีหมวดชื่อนี้อยู่แล้ว" };
  if (error) return { error: "เปลี่ยนชื่อไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

/**
 * ซ่อนหมวด ไม่ลบทิ้ง — รายการเก่าอ้างหมวดนี้อยู่ (FK on delete restrict)
 * ถ้าลบจริงจะทำให้ประวัติที่บันทึกไปแล้วหาย
 */
export async function toggleArchive(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  const archived = formData.get("archived") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  await supabase
    .from("categories")
    .update({ is_archived: !archived })
    .eq("id", id.data);
  revalidate();
}

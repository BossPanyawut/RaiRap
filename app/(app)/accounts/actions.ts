"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error: string } | { ok: true } | null;

export const ACCOUNT_KINDS = {
  cash: "เงินสด",
  bank: "บัญชีธนาคาร",
  credit: "บัตรเครดิต",
  ewallet: "วอลเล็ต",
} as const;

const accountInput = z.object({
  name: z.string().trim().min(1, "ใส่ชื่อบัญชี").max(40, "ชื่อยาวเกิน 40 ตัว"),
  kind: z.enum(Object.keys(ACCOUNT_KINDS) as [string, ...string[]]),
});

function revalidate() {
  for (const p of ["/", "/accounts", "/transactions", "/analytics"]) revalidatePath(p);
}

export async function createAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const parsed = accountInput.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind as "cash" | "bank" | "credit" | "ewallet",
  });

  if (error?.code === "23505") return { error: "มีบัญชีชื่อนี้อยู่แล้ว" };
  if (error) return { error: "เพิ่มบัญชีไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

export async function renameAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const id = z.uuid().safeParse(formData.get("id"));
  const name = z.string().trim().min(1).max(40).safeParse(formData.get("name"));
  if (!id.success || !name.success) return { error: "ชื่อบัญชีไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ name: name.data })
    .eq("id", id.data);

  if (error?.code === "23505") return { error: "มีบัญชีชื่อนี้อยู่แล้ว" };
  if (error) return { error: "เปลี่ยนชื่อไม่สำเร็จ ลองอีกครั้ง" };

  revalidate();
  return { ok: true };
}

/**
 * ซ่อน ไม่ลบ — ลบบัญชีทำให้ account_id ของรายการเก่ากลายเป็น null (on delete set null)
 * รายการไม่หาย แต่ประวัติว่าจ่ายจากบัญชีไหนหายถาวร กู้กลับไม่ได้
 */
export async function toggleArchiveAccount(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  const archived = formData.get("archived") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("accounts").update({ is_archived: !archived }).eq("id", id.data);
  revalidate();
}

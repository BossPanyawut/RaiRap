"use server";

import { revalidatePath } from "next/cache";
import { parseCSV } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export type ImportState =
  | { error: string }
  | { ok: string; skipped: string[] }
  | null;

const MAX_BYTES = 2_000_000;
const MAX_ROWS = 5000;

export async function importCSV(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "เลือกไฟล์ CSV ก่อน" };
  if (file.size > MAX_BYTES) return { error: "ไฟล์ใหญ่เกิน 2 MB" };

  const { rows, errors } = parseCSV(await file.text());

  if (rows.length === 0) {
    return { error: errors[0] ?? "ไม่มีแถวที่นำเข้าได้" };
  }
  if (rows.length > MAX_ROWS) {
    return { error: `ไฟล์มี ${rows.length} แถว นำเข้าได้ครั้งละไม่เกิน ${MAX_ROWS}` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  const { data: cats } = await supabase.from("categories").select("id, name, kind");
  const byKey = new Map((cats ?? []).map((c) => [`${c.kind}:${c.name}`, c.id]));

  // หมวดที่ยังไม่มีก็สร้างให้ ไม่ใช่ทิ้งแถวนั้น — คนส่งออกจากแอปอื่นมามักมี
  // ชื่อหมวดที่เราไม่รู้จัก ถ้าไม่สร้างให้ ครึ่งไฟล์จะหายเงียบ
  const missing = new Map<string, { name: string; kind: "income" | "expense" }>();
  for (const r of rows) {
    const key = `${r.kind}:${r.category}`;
    if (!byKey.has(key) && !missing.has(key)) {
      missing.set(key, { name: r.category, kind: r.kind });
    }
  }

  if (missing.size > 0) {
    const { data: made, error } = await supabase
      .from("categories")
      .insert([...missing.values()].map((m) => ({ user_id: user.id, name: m.name, kind: m.kind, sort_order: 50 })))
      .select("id, name, kind");
    if (error) return { error: "สร้างหมวดหมู่ที่ขาดไม่สำเร็จ ลองอีกครั้ง" };
    for (const c of made ?? []) byKey.set(`${c.kind}:${c.name}`, c.id);
  }

  const { error } = await supabase.from("transactions").insert(
    rows.map((r) => ({
      user_id: user.id,
      category_id: byKey.get(`${r.kind}:${r.category}`)!,
      kind: r.kind,
      amount: r.amount,
      occurred_on: r.occurred_on,
      note: r.note,
    })),
  );
  if (error) return { error: "นำเข้าไม่สำเร็จ ลองอีกครั้ง" };

  for (const p of ["/", "/transactions", "/budgets", "/analytics", "/categories", "/settings"]) {
    revalidatePath(p);
  }

  const newCats = missing.size ? ` สร้างหมวดใหม่ ${missing.size} หมวด` : "";
  return {
    ok: `นำเข้า ${rows.length} รายการแล้ว${newCats}`,
    // บอกทุกแถวที่ข้าม ไม่ใช่แค่นับ — ผู้ใช้ต้องรู้ว่าแถวไหนหายเพราะอะไร
    skipped: errors,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ReceiptState = { error: string } | { ok: true } | null;

const MAX_BYTES = 5_000_000;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function uploadReceipt(
  _prev: ReceiptState,
  formData: FormData,
): Promise<ReceiptState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ไม่พบรายการนี้" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "เลือกไฟล์ก่อน" };
  if (file.size > MAX_BYTES) return { error: "ไฟล์ใหญ่เกิน 5 MB" };
  if (!TYPES.has(file.type)) return { error: "รับเฉพาะรูป JPG, PNG, WebP หรือไฟล์ PDF" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง" };

  // ต้องมี uid เป็นโฟลเดอร์แรกเสมอ — policy ของ bucket เทียบ
  // storage.foldername(name)[1] กับ auth.uid() ถ้าตั้ง path เอง
  // แบบอื่นจะอัปโหลดไม่ผ่าน (และนั่นคือสิ่งที่ต้องการ)
  const path = `${user.id}/${crypto.randomUUID()}.${EXT[file.type]}`;

  const { error: upErr } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type });
  if (upErr) return { error: "อัปโหลดไม่สำเร็จ ลองอีกครั้ง" };

  // RLS จำกัดให้แตะได้เฉพาะรายการของตัวเอง — ถ้าไม่ใช่เจ้าของจะไม่โดนแถวไหน
  const { data: updated } = await supabase
    .from("transactions")
    .update({ receipt_path: path })
    .eq("id", id.data)
    .select("id, receipt_path");

  if (!updated?.length) {
    // อัปเดตไม่โดนแถว = ไม่ใช่รายการของเรา ลบไฟล์ที่เพิ่งอัปทิ้ง ไม่ทิ้งขยะไว้
    await supabase.storage.from("receipts").remove([path]);
    return { error: "ไม่พบรายการนี้" };
  }

  revalidatePath("/transactions");
  return { ok: true };
}

export async function removeReceipt(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();

  // อ่าน path ผ่าน RLS ก่อน — ถ้าไม่ใช่เจ้าของจะไม่ได้อะไรกลับมา
  const { data: tx } = await supabase
    .from("transactions")
    .select("receipt_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!tx?.receipt_path) return;

  await supabase.storage.from("receipts").remove([tx.receipt_path]);
  await supabase.from("transactions").update({ receipt_path: null }).eq("id", id.data);
  revalidatePath("/transactions");
}

/**
 * ลิงก์ชั่วคราวสำหรับเปิดดูใบเสร็จ
 * bucket เป็น private จึงไม่มี public URL ให้ใช้ — signed URL หมดอายุใน 5 นาที
 * ไม่ใช่ลิงก์ถาวรที่หลุดแล้วเปิดได้ตลอดกาล
 */
export async function receiptUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

import { z } from "zod";

/**
 * Supabase เปลี่ยนชื่อ API key: `sb_publishable_…` มาแทน anon JWT ตัวเก่า
 * (และ `sb_secret_…` แทน service_role) project ใหม่ได้ชื่อใหม่ ส่วน project เก่า
 * และ Supabase ในเครื่องยังให้ anon key อยู่ — รับทั้งสองชื่อ ให้ตัวใหม่ชนะ
 *
 * ทั้งสองแบบใช้กับ supabase-js เหมือนกัน และปลอดภัยที่จะอยู่ในเบราว์เซอร์
 * (RLS เป็นคนกันข้อมูล ไม่ใช่ตัว key) จึงขึ้นต้นด้วย NEXT_PUBLIC_ ได้
 * ที่ห้ามหลุดถึงเบราว์เซอร์คือ `sb_secret_…` / service_role ซึ่งข้าม RLS
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

// NEXT_PUBLIC_* ถูกแทนค่าตอน build จึงอ้างชื่อตรง ๆ ไม่ใช่วนลูป process.env
const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  throw new Error(
    `ตั้งค่า environment ไม่ครบ — คัดลอก .env.example เป็น .env.local แล้วใส่ค่าจริง\n${z.prettifyError(parsed.error)}`,
  );
}

const key =
  parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!key) {
  throw new Error(
    "ตั้งค่า environment ไม่ครบ — ต้องมี NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (project ใหม่) " +
      "หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY (project เก่า / Supabase ในเครื่อง)",
  );
}

/**
 * key ของ Supabase ในเครื่องเป็น JWT ที่ iss = "supabase-demo" (ประกาศในเอกสาร
 * เหมือนกันทุกเครื่อง) — ต้องถอด payload อ่านจริง จะหา substring ใน base64
 * ไม่ได้ เพราะ base64 เข้ารหัสทีละ 3 ไบต์ คำที่อยู่ข้างในไม่โผล่เป็น substring
 * ของผลลัพธ์เสมอไป ขึ้นกับ alignment
 */
function isLocalDemoKey(k: string): boolean {
  const payload = k.split(".")[1];
  if (!payload) return false;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json).iss === "supabase-demo";
  } catch {
    return false;
  }
}

// กันเคสที่เจ็บที่สุด: URL ของ cloud กับ key ของเครื่อง (หรือกลับกัน) ปนกันใน
// .env.local เดียว แล้วแอปยิงไม่ติดโดยไม่บอกว่าเพราะอะไร
const isLocalUrl = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(
  parsed.data.NEXT_PUBLIC_SUPABASE_URL,
);
const isLocalKey = isLocalDemoKey(key);

if (isLocalUrl !== isLocalKey) {
  throw new Error(
    `URL กับ key คนละที่กัน — URL ชี้ ${isLocalUrl ? "เครื่องนี้" : "cloud"} แต่ key เป็นของ ${isLocalKey ? "เครื่องนี้" : "cloud"}\n` +
      "ตรวจ .env.local ว่าไม่ได้มีค่าซ้ำจากทั้งสองที่ปนกัน",
  );
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_KEY: key,
};

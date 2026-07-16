import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// NEXT_PUBLIC_* ถูกแทนค่าตอน build จึงอ้างชื่อตรง ๆ ไม่ใช่วนลูป process.env
const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  throw new Error(
    `ตั้งค่า environment ไม่ครบ — คัดลอก .env.example เป็น .env.local แล้วใส่ค่าจริง\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;

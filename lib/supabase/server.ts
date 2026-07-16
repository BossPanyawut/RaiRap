import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component เขียน cookie ไม่ได้ — proxy.ts รีเฟรช session ให้แล้ว
          }
        },
      },
    },
  );
}

/**
 * ผู้ใช้ปัจจุบัน — ใช้ getUser() ไม่ใช่ getSession()
 * getSession() อ่าน cookie ดิบโดยไม่ตรวจลายเซ็น ปลอมได้ ห้ามใช้ฝั่ง server
 * getUser() ยิงไปตรวจกับ auth server จริง
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import {
  SESSION_ONLY_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth-cookies";

export async function createClient(options?: { sessionOnly?: boolean }) {
  const cookieStore = await cookies();
  const sessionOnly =
    options?.sessionOnly ?? cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(
                name,
                value,
                sessionOnly ? sessionCookieOptions(value, options) : options,
              );
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

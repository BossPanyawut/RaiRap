import type { CookieOptions } from "@supabase/ssr";

export const SESSION_ONLY_COOKIE = "rairap-session-only";

/**
 * Supabase SSR กำหนด maxAge ให้ auth cookie โดยปริยาย ถ้าผู้ใช้ไม่เลือก
 * “จดจำฉัน” ต้องเอาอายุออกเพื่อให้เบราว์เซอร์ลบ cookie เมื่อจบ session
 * แต่ cookie ที่ใช้ล้างค่า (maxAge = 0) ต้องเก็บไว้ ไม่งั้นออกจากระบบไม่สำเร็จ
 */
export function sessionCookieOptions(
  value: string,
  options: CookieOptions,
): CookieOptions {
  if (!value) return options;

  const sessionOptions = { ...options };
  delete sessionOptions.maxAge;
  delete sessionOptions.expires;
  return sessionOptions;
}

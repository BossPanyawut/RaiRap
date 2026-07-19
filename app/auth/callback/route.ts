import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * ปลายทาง PKCE ของ OAuth login — Supabase ส่งผู้ใช้กลับมาที่นี่พร้อม ?code=
 * แลก code เป็น session cookie แล้วพาไปหน้าที่ตั้งใจจะไปตั้งแต่แรก
 * path นี้เปิดสาธารณะผ่าน PUBLIC_PATHS ใน proxy.ts (ขึ้นต้น /auth)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // กติกาเดียวกับ safeNextPath ใน app/(auth)/actions.ts — path ภายในเท่านั้น
  const rawNext = searchParams.get("next");
  const next =
    typeof rawNext === "string" && /^\/(?![/\\])/.test(rawNext) ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      revalidatePath("/", "layout");
      // หลัง load balancer (Vercel) origin เป็นของ internal host —
      // โดเมนจริงที่ผู้ใช้เห็นอยู่ใน x-forwarded-host
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (!isLocal && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // code หาย/หมดอายุ/ถูกใช้แล้ว — กลับหน้า login พร้อมข้อความ generic
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}

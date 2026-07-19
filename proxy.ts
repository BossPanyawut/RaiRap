import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  SESSION_ONLY_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth-cookies";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/welcome",
  "/terms",
  "/privacy",
];

/**
 * Next 16 เปลี่ยนชื่อ Middleware → Proxy ไฟล์ต้องชื่อ proxy.ts และ export ชื่อ proxy
 * (tutorial ของ Supabase ทั้งหมดยังเขียน middleware.ts ซึ่งใช้กับ Next 16 ไม่ได้)
 *
 * หน้าที่เดียวของไฟล์นี้คือรีเฟรช session cookie ให้ต่ออายุ + เด้ง path ที่ยังไม่ล็อกอิน
 * เอกสาร Next เตือนเองว่า proxy ไม่ใช่ที่สำหรับ authorization — ตัวจริงคือ RLS ใน Postgres
 * (ยืนยันแล้วใน scripts/rls-gate.mjs) การ redirect ตรงนี้เป็นแค่ UX ไม่ใช่ด่านกันข้อมูล
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === "1";

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(
              name,
              value,
              sessionOnly ? sessionCookieOptions(value, options) : options,
            );
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // คนที่ยังไม่ล็อกอินเปิดหน้าแรก = คนแปลกหน้า → landing ไม่ใช่ฟอร์ม login
    // path ลึกกว่านั้นคือคนที่ตั้งใจมา ให้ไป login แล้วเด้งกลับที่เดิม
    if (pathname === "/") {
      url.pathname = "/welcome";
      url.search = "";
    } else {
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

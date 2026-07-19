"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SESSION_ONLY_COOKIE } from "@/lib/auth-cookies";
import { captchaToken } from "@/lib/captcha";
import { getI18n } from "@/lib/i18n-server";

const credentials = z.object({
  email: z.email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว"),
});

const signUpInput = credentials.extend({
  displayName: z.string().min(1, "ใส่ชื่อที่อยากให้เรียก"),
});

/**
 * ปลายทางหลังล็อกอิน — รับเฉพาะ path ภายในแอปเท่านั้น
 * ต้องขึ้นต้นด้วย / ตัวเดียว: "//evil.com" และ "/\evil.com" เป็น URL
 * แบบ protocol-relative ที่เบราว์เซอร์พาออกนอกโดเมนได้ = open redirect
 * ค่าที่ไม่ผ่านเงื่อนไขทั้งหมดตกกลับหน้าแรก ไม่ error
 */
function safeNextPath(formData: FormData): string {
  const next = formData.get("next");
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}

export type AuthState = { error: string } | null;

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getI18n();
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const rememberMe = formData.get("rememberMe") === "on";
  const supabase = await createClient({ sessionOnly: !rememberMe });
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken: captchaToken(formData) },
  });

  // ไม่บอกว่าอีเมลมีอยู่จริงไหม — กันการไล่เดาว่าใครสมัครไว้บ้าง
  if (error) return { error: t("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "Email or password is incorrect") };

  const cookieStore = await cookies();
  if (rememberMe) {
    cookieStore.delete(SESSION_ONLY_COOKIE);
  } else {
    cookieStore.set(SESSION_ONLY_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getI18n();
  const parsed = signUpInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      captchaToken: captchaToken(formData),
    },
  });

  // ไม่ส่ง error.message ดิบของ Supabase กลับไป — มันเป็นภาษาอังกฤษล้วน
  // และบางข้อความยืนยันว่าอีเมลไหนมีบัญชีอยู่แล้ว (account enumeration)
  if (error) {
    return {
      error: t(
        "สมัครด้วยอีเมลนี้ไม่ได้ ลองเข้าสู่ระบบ หรือใช้อีเมลอื่น",
        "Could not sign up with this email. Try signing in, or use another email.",
      ),
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Login ด้วย OAuth (PKCE flow ฝั่ง server) — signInWithOAuth คืน URL ของหน้า
 * ยินยอมของ provider แล้วเราพาผู้ใช้ไปเอง กลับมาที่ /auth/callback พร้อม code
 * ให้แลกเป็น session (app/auth/callback/route.ts)
 *
 * redirectTo ต้องอยู่ใน additional_redirect_urls ของ supabase/config.toml
 * ค่า host ที่อ่านจาก header ปลอมได้ แต่ค่าปลอมไม่อยู่ใน allowlist ของ Supabase
 * จึงตกกลับ site_url ไม่ใช่โดเมนของคนปลอม
 */
export async function signInWithProvider(formData: FormData) {
  const raw = formData.get("provider");
  const provider = raw === "google" || raw === "facebook" ? raw : null;
  if (!provider) redirect("/login");

  const next = safeNextPath(formData);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // ไม่ส่งรายละเอียด error ของ provider กลับไป — หน้า login แสดงข้อความ generic
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SESSION_ONLY_COOKIE } from "@/lib/auth-cookies";
import { getI18n } from "@/lib/i18n-server";

const credentials = z.object({
  email: z.email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว"),
});

const signUpInput = credentials.extend({
  displayName: z.string().min(1, "ใส่ชื่อที่อยากให้เรียก"),
});

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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

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
  redirect("/");
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
    options: { data: { display_name: parsed.data.displayName } },
  });

  if (error) return { error: t(error.message, "Could not create the account. Try again.") };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}

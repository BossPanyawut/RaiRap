"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Turnstile } from "@/components/turnstile";
import { useLocale } from "@/components/locale-provider";

export default function LoginPage() {
  const { t } = useLocale();
  const [state, action, pending] = useActionState(signIn, null);
  const searchParams = useSearchParams();
  // path ที่ proxy แนบมาตอนเด้งเข้า login — ฝั่ง action ตรวจอีกชั้นว่าเป็น
  // path ภายในจริงก่อน redirect (safeNextPath) ค่าปลอมจากคนแก้ URL จึงไม่มีผล
  const nextPath = searchParams.get("next") ?? "/";
  // OAuth ล้มเหลว (ผู้ใช้กดยกเลิก / code หมดอายุ) — ข้อความ generic เสมอ
  const oauthError = searchParams.get("error") === "oauth";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">{t("เข้าสู่ระบบ", "Sign in")}</h1>
        <p className="text-text-muted mt-1 text-[15px]">
          {t("ดูว่าเดือนนี้เหลือเท่าไหร่", "See how much you have left this month")}
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <Field
            id="email"
            name="email"
            type="email"
            label={t("อีเมล", "Email")}
            autoComplete="email"
            required
          />
          <Field
            id="password"
            name="password"
            type="password"
            label={t("รหัสผ่าน", "Password")}
            autoComplete="current-password"
            required
          />

          <label className="flex w-fit cursor-pointer items-center gap-2 text-[15px]">
            <input
              type="checkbox"
              name="rememberMe"
              className="accent-accent-primary-strong size-4 shrink-0"
            />
            <span>{t("จดจำฉัน", "Remember me")}</span>
          </label>

          <Turnstile />

          {state?.error && <Alert>{state.error}</Alert>}
          {!state?.error && oauthError && (
            <Alert>
              {t(
                "เข้าสู่ระบบด้วยบัญชีภายนอกไม่สำเร็จ ลองอีกครั้ง",
                "Could not sign in with that account. Try again.",
              )}
            </Alert>
          )}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? t("กำลังเข้าสู่ระบบ", "Signing in") : t("เข้าสู่ระบบ", "Sign in")}
          </Button>
        </form>

        <div className="mt-5">
          <OAuthButtons nextPath={nextPath} />
        </div>

        <p className="text-text-muted mt-6 text-[15px]">
          {t("ยังไม่มีบัญชี", "No account yet?")}{" "}
          <Link href="/signup" className="text-link font-medium underline">
            {t("สมัครใช้งาน", "Create account")}
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}

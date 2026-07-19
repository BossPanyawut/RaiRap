"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Turnstile } from "@/components/turnstile";
import { useLocale } from "@/components/locale-provider";

export default function SignUpPage() {
  const { t } = useLocale();
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">{t("สมัครใช้งาน", "Create account")}</h1>
        <p className="text-text-muted mt-1 text-[15px]">
          {t("เริ่มบันทึกรายรับ-รายจ่ายของเดือนนี้", "Start tracking this month's income and expenses")}
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <Field
            id="displayName"
            name="displayName"
            label={t("อยากให้เรียกว่าอะไร", "What should we call you?")}
            autoComplete="nickname"
            required
          />
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
            autoComplete="new-password"
            hint={t("อย่างน้อย 8 ตัว", "At least 8 characters")}
            required
          />

          <Turnstile />

          {state?.error && <Alert>{state.error}</Alert>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? t("กำลังสมัคร", "Creating account") : t("สมัครใช้งาน", "Create account")}
          </Button>

          <p className="text-text-muted text-sm">
            {t("การสมัครถือว่ายอมรับ", "By creating an account you accept the")}{" "}
            <Link href="/terms" className="text-link underline">
              {t("เงื่อนไขการใช้งาน", "terms of service")}
            </Link>{" "}
            {t("และ", "and the")}{" "}
            <Link href="/privacy" className="text-link underline">
              {t("นโยบายความเป็นส่วนตัว", "privacy policy")}
            </Link>
          </p>
        </form>

        <div className="mt-5">
          <OAuthButtons nextPath="/" />
        </div>

        <p className="text-text-muted mt-6 text-[15px]">
          {t("มีบัญชีแล้ว", "Already have an account?")}{" "}
          <Link href="/login" className="text-link font-medium underline">
            {t("เข้าสู่ระบบ", "Sign in")}
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}

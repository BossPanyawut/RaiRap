"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";

export default function LoginPage() {
  const { t } = useLocale();
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">{t("เข้าสู่ระบบ", "Sign in")}</h1>
        <p className="text-text-muted mt-1 text-[15px]">
          {t("ดูว่าเดือนนี้เหลือเท่าไหร่", "See how much you have left this month")}
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
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

          {state?.error && <Alert>{state.error}</Alert>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? t("กำลังเข้าสู่ระบบ", "Signing in") : t("เข้าสู่ระบบ", "Sign in")}
          </Button>
        </form>

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

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-text-muted mt-1 text-[15px]">
          ดูว่าเดือนนี้เหลือเท่าไหร่
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <Field
            id="email"
            name="email"
            type="email"
            label="อีเมล"
            autoComplete="email"
            required
          />
          <Field
            id="password"
            name="password"
            type="password"
            label="รหัสผ่าน"
            autoComplete="current-password"
            required
          />

          {state?.error && <Alert>{state.error}</Alert>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="text-text-muted mt-6 text-[15px]">
          ยังไม่มีบัญชี{" "}
          <Link href="/signup" className="text-accent-deep font-medium underline">
            สมัครใช้งาน
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}

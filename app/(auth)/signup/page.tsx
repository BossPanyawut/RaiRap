"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">สมัครใช้งาน</h1>
        <p className="text-text-muted mt-1 text-[15px]">
          เริ่มบันทึกรายรับ-รายจ่ายของเดือนนี้
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <Field
            id="displayName"
            name="displayName"
            label="อยากให้เรียกว่าอะไร"
            autoComplete="nickname"
            required
          />
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
            autoComplete="new-password"
            hint="อย่างน้อย 8 ตัว"
            required
          />

          {state?.error && <Alert>{state.error}</Alert>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "กำลังสมัคร" : "สมัครใช้งาน"}
          </Button>
        </form>

        <p className="text-text-muted mt-6 text-[15px]">
          มีบัญชีแล้ว{" "}
          <Link href="/login" className="text-accent-deep font-medium underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}

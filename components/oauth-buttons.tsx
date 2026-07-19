"use client";

import { signInWithProvider } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0" fill="currentColor">
      <path d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.7h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.74 2.98-4.3 2.98-7.26Z" />
      <path d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H1.06v2.6A10 10 0 0 0 10 20Z" />
      <path d="M4.4 11.9a6 6 0 0 1 0-3.8V5.5H1.06a10 10 0 0 0 0 9l3.34-2.6Z" />
      <path d="M10 3.98c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.5L4.4 8.1C5.19 5.74 7.4 3.98 10 3.98Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0" fill="currentColor">
      <path d="M20 10.06C20 4.5 15.52 0 10 0S0 4.5 0 10.06C0 15.08 3.66 19.24 8.44 20v-7.03H5.9v-2.9h2.54V7.84c0-2.52 1.5-3.9 3.77-3.9 1.09 0 2.23.19 2.23.19v2.47h-1.25c-1.24 0-1.63.77-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V20C16.34 19.24 20 15.08 20 10.06Z" />
    </svg>
  );
}

/**
 * ปุ่ม login ด้วย Google / Facebook — ใช้ในหน้า login และ signup
 * แต่ละปุ่มเป็นฟอร์มของตัวเอง ยิง server action เดียวกันโดยส่งชื่อ provider
 * ?next= ส่งต่อไปจนถึง /auth/callback เพื่อกลับหน้าที่ตั้งใจไว้หลังล็อกอิน
 */
export function OAuthButtons({ nextPath }: { nextPath: string }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3">
      <div className="text-text-muted flex items-center gap-3 text-sm" aria-hidden="true">
        <span className="border-glass-border flex-1 border-t" />
        {t("หรือ", "or")}
        <span className="border-glass-border flex-1 border-t" />
      </div>

      <form action={signInWithProvider} className="contents">
        <input type="hidden" name="next" value={nextPath} />
        <input type="hidden" name="provider" value="google" />
        <Button type="submit" variant="secondary">
          <GoogleIcon />
          {t("เข้าสู่ระบบด้วย Google", "Continue with Google")}
        </Button>
      </form>

      <form action={signInWithProvider} className="contents">
        <input type="hidden" name="next" value={nextPath} />
        <input type="hidden" name="provider" value="facebook" />
        <Button type="submit" variant="secondary">
          <FacebookIcon />
          {t("เข้าสู่ระบบด้วย Facebook", "Continue with Facebook")}
        </Button>
      </form>
    </div>
  );
}

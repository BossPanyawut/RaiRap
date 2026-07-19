"use client";

import Script from "next/script";
import { useLocale } from "@/components/locale-provider";

/**
 * Cloudflare Turnstile — เปิดด้วย env ตัวเดียว: ตั้ง NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * แล้วช่องยืนยันจะโผล่ในฟอร์ม login/signup เอง (implicit rendering ของ Turnstile
 * แทรก input ชื่อ cf-turnstile-response ให้ในฟอร์ม server action อ่านต่อได้เลย)
 *
 * ต้องเปิดคู่กับ [auth.captcha] ใน supabase/config.toml เสมอ — เปิดฝั่งเดียว:
 * มีแต่ widget = ผู้ใช้กดยืนยันฟรีโดยไม่มีใครตรวจ / มีแต่ server = login พังทุกคน
 * ขั้นตอนอยู่ใน docs/deploy.md
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Turnstile() {
  const { locale } = useLocale();
  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div
        className="cf-turnstile"
        data-sitekey={SITE_KEY}
        data-theme="auto"
        data-language={locale}
      />
    </>
  );
}

import type { NextConfig } from "next";

/**
 * Security headers — ใช้ทั้ง dev และ production เพื่อให้ gate ตรวจได้ในเครื่อง
 * และของจริงไม่ต่างจากที่ทดสอบ
 *
 * CSP หมายเหตุ:
 * - script-src มี 'unsafe-inline' เพราะ Next ฝัง inline script ตอน hydrate
 *   (ทางแก้เต็มคือ nonce ผ่าน proxy ซึ่งแลกกับความซับซ้อนสูง — บันทึกไว้ใน
 *   docs/security.md เป็น residual risk) ถึงอย่างนั้น CSP ยังตัดทาง exfiltrate:
 *   connect/img/frame จำกัดปลายทางไว้แค่ตัวเอง + Supabase + Turnstile
 * - 'unsafe-eval' ให้เฉพาะ dev — React Refresh ต้องใช้ ส่วน production ไม่มี
 * - Supabase host อ่านจาก env ตอน start ถ้ายังไม่ตั้ง (เช่นตอน lint ใน CI)
 *   ใช้ค่ากว้างของทั้ง local และ cloud แทน
 */
const dev = process.env.NODE_ENV !== "production";
const supabaseHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321 https://*.supabase.co";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  // ใบเสร็จเปิดผ่าน signed URL ของ Supabase / preview ตอนอัปโหลดเป็น blob:
  `img-src 'self' data: blob: ${supabaseHost}`,
  "font-src 'self'",
  // dev ต้องมี ws: ให้ HMR — production ไม่มี
  `connect-src 'self' ${supabaseHost}${dev ? " ws:" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // เบราว์เซอร์สนใจ HSTS เฉพาะบน https อยู่แล้ว ส่งตลอดจึงไม่กระทบ dev
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

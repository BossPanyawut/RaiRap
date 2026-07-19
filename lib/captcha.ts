/** ชื่อ field ที่ Turnstile (implicit rendering) แทรกในฟอร์ม — ใช้ร่วมกันระหว่าง
 *  widget ฝั่ง client กับ server action ที่อ่าน token ไปส่งให้ Supabase */
export const CAPTCHA_FIELD = "cf-turnstile-response";

/** token จากฟอร์ม — ว่าง/ไม่มี = ไม่ได้เปิด captcha ให้ส่ง undefined ไป Supabase */
export function captchaToken(formData: FormData): string | undefined {
  const token = formData.get(CAPTCHA_FIELD);
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

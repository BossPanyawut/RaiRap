import { cookies } from "next/headers";

export const THEME_COOKIE = "rairap-theme";
export type Theme = "light" | "dark";

/**
 * อ่าน theme จาก cookie ฝั่ง server แล้วใส่ลง <html data-theme> ตั้งแต่ HTML แรก
 * ถ้าอ่านจาก localStorage ฝั่ง client จอจะสว่างวาบก่อนแล้วค่อยกลายเป็นมืด
 */
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  return store.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}

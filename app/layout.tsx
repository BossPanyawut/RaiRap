import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Space_Grotesk } from "next/font/google";
import { LocaleProvider } from "@/components/locale-provider";
import { getLocale } from "@/lib/locale-server";
import { getTheme } from "@/lib/theme";
import "./globals.css";

// ตัวแปรฟอนต์ตาม docs/design-direction.md §A
// Space Grotesk เป็น variable font จึงไม่ต้องระบุ weight
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// IBM Plex Sans Thai ไม่ใช่ variable font — ต้องระบุ weight ที่ใช้จริง
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "en"
    ? {
        title: "RaiRap — Income and expense tracker",
        description: "See how much you have left this month and where it is heading.",
      }
    : {
        title: "RaiRap — บันทึกรายรับ-รายจ่าย",
        description: "ดูว่าเดือนนี้เหลือเท่าไหร่ และกำลังจะเหลือเท่าไหร่",
      };
}

// เปิดพื้นที่ safe area ให้แถบนำทางมือถือหลบขอบจอและ home indicator ได้
// ไม่ปิด userScalable — ผู้ใช้ยัง pinch-to-zoom ได้ตาม WCAG
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // อ่าน theme ฝั่ง server แล้วใส่ตั้งแต่ HTML แรก — ถ้าไปอ่าน localStorage
  // ฝั่ง client จอจะสว่างวาบก่อนแล้วค่อยกลายเป็นมืด
  const [theme, locale] = await Promise.all([getTheme(), getLocale()]);

  return (
    // lang ต้องตรงกับภาษาที่เลือกตั้งแต่ HTML แรก เพื่อ line-breaking ภาษาไทย
    // และการออกเสียงของ screen reader ที่ถูกต้อง
    <html
      lang={locale}
      data-theme={theme}
      data-locale={locale}
      className={`${spaceGrotesk.variable} ${plexThai.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}

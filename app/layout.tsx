import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Space_Grotesk } from "next/font/google";
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

export const metadata: Metadata = {
  title: "RaiRap — บันทึกรายรับ-รายจ่าย",
  description: "ดูว่าเดือนนี้เหลือเท่าไหร่ และกำลังจะเหลือเท่าไหร่",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // อ่าน theme ฝั่ง server แล้วใส่ตั้งแต่ HTML แรก — ถ้าไปอ่าน localStorage
  // ฝั่ง client จอจะสว่างวาบก่อนแล้วค่อยกลายเป็นมืด
  const theme = await getTheme();

  return (
    // lang="th" เป็นของจำเป็น ไม่ใช่ของประดับ — ไทยไม่เว้นวรรคระหว่างคำ
    // ถ้าไม่ตั้ง เบราว์เซอร์ไม่ใช้ dictionary line-breaking แล้วตัดบรรทัดกลางคำ
    <html
      lang="th"
      data-theme={theme}
      className={`${spaceGrotesk.variable} ${plexThai.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

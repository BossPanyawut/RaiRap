import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAlerts } from "@/lib/alerts";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  // proxy.ts เด้งไปแล้วในเคสปกติ อันนี้กันพลาดถ้า matcher หลุด
  if (!settings) redirect("/login");

  // สร้างรายการเกิดซ้ำที่ถึงกำหนดแล้ว — ทำตอนผู้ใช้เปิดแอป แทนที่จะใช้ cron
  // ถ้าไม่เปิดแอปก็ยังไม่มีใครต้องเห็น พอเปิดเมื่อไหร่ก็ตามทุกงวดที่ค้าง
  // ฟังก์ชันเป็น idempotent (unique index กันซ้ำ) เรียกทุกครั้งจึงปลอดภัย
  const supabase = await createClient();
  await supabase.rpc("materialize_recurring");

  const [alerts, locale] = await Promise.all([getAlerts(), getLocale()]);

  return (
    <>
      <Nav
        displayName={settings.displayName}
        alerts={alerts}
        currency={settings.currency}
        locale={locale}
      />
      <div className="pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </div>
    </>
  );
}

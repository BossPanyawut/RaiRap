import { SettingsForm } from "@/components/settings-form";
import { currentPeriod, periodRange } from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/theme";

export default async function SettingsPage() {
  const settings = (await getSettings())!;
  const theme = await getTheme();
  const period = currentPeriod(settings.cycleStartDay);
  const range = periodRange(period, settings.cycleStartDay);
  const supabase = await createClient();

  // นับให้เห็นก่อนลบ — ปุ่มล้างข้อมูลบังคับให้พิมพ์ตัวเลขนี้ ผู้ใช้จึงต้องเห็น
  // จำนวนจริงก่อนเสมอ ไม่ใช่กด "แน่ใจไหม" ผ่าน ๆ
  const [{ count: all }, { count: inPeriod }] = await Promise.all([
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("occurred_on", range.from)
      .lte("occurred_on", range.to),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">ตั้งค่า</h1>
      <SettingsForm
        email={settings.email}
        displayName={settings.displayName}
        currency={settings.currency}
        cycleStartDay={settings.cycleStartDay}
        theme={theme}
        counts={{ all: all ?? 0, period: inPeriod ?? 0 }}
      />
    </main>
  );
}

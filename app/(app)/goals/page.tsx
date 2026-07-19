import { GoalsManager, type Goal } from "@/components/goals-manager";
import { WhatIf } from "@/components/what-if";
import { currentPeriod, formatPeriodTH, shiftPeriod } from "@/lib/dates";
import { getCategorySpend } from "@/lib/period-data";
import { getSettings } from "@/lib/profile";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const { currency, cycleStartDay } = (await getSettings())!;
  const { locale, t } = await getI18n();
  const period = currentPeriod(cycleStartDay);
  const supabase = await createClient();

  const [{ data: goals }, { data: summary }, { data: recent }, categories] =
    await Promise.all([
      supabase.from("saving_goals").select("*").order("created_at"),
      supabase
        .from("v_monthly_summary")
        .select("income, expense, net")
        .eq("period_month", period)
        .maybeSingle(),
      // เฉลี่ยจาก 3 รอบล่าสุด — รอบเดียวแกว่งเกินกว่าจะใช้วางแผนระยะยาว
      supabase
        .from("v_monthly_summary")
        .select("net")
        .gte("period_month", shiftPeriod(period, -2))
        .lte("period_month", period),
      getCategorySpend(period, cycleStartDay),
    ]);

  const nets = (recent ?? []).map((r) => Number(r.net ?? 0));
  const monthlyNet = nets.length ? nets.reduce((s, n) => s + n, 0) / nets.length : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <div className="px-1">
        <h1 className="text-2xl font-semibold">{t("เป้าหมายและการวางแผน", "Goals and planning")}</h1>
        <p className="text-text-muted mt-1 text-sm">
          {t("คำนวณจากยอดเหลือเฉลี่ย", "Based on the average balance from the latest")} {nets.length} {t("รอบล่าสุด", "cycles")}
        </p>
      </div>

      <GoalsManager
        goals={(goals ?? []) as Goal[]}
        monthlyNet={monthlyNet}
        categories={categories}
        currency={currency}
      />

      <h2 className="mt-4 px-1 text-2xl font-semibold">
        {t("จำลอง", "Scenario")} {formatPeriodTH(period, cycleStartDay, locale)}
      </h2>
      <WhatIf
        categories={categories}
        income={Number(summary?.income ?? 0)}
        expense={Number(summary?.expense ?? 0)}
        currency={currency}
      />
    </main>
  );
}

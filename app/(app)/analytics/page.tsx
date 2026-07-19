import { BalanceTrend } from "@/components/charts/balance-trend";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { IncomeExpenseBar } from "@/components/charts/income-expense-bar";
import { GlassCard } from "@/components/ui/glass-card";
import { currentPeriod, formatPeriodTH, periodRange, shiftPeriod } from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const { currency, cycleStartDay } = (await getSettings())!;
  const { locale, t } = await getI18n();
  const period = currentPeriod(cycleStartDay);
  const range = periodRange(period, cycleStartDay);
  const from = shiftPeriod(period, -11);
  const supabase = await createClient();

  const [{ data: balance }, { data: expenses }] = await Promise.all([
    supabase
      .from("v_running_balance")
      .select("period_month, income, expense, balance")
      .gte("period_month", from)
      .order("period_month"),
    supabase
      .from("transactions")
      .select("amount, categories(name)")
      .eq("kind", "expense")
      .gte("occurred_on", range.from)
      .lte("occurred_on", range.to),
  ]);

  const trend = (balance ?? []).map((r) => ({
    period: r.period_month!,
    balance: Number(r.balance ?? 0),
  }));

  const months = (balance ?? []).map((r) => ({
    period: r.period_month!,
    income: Number(r.income ?? 0),
    expense: Number(r.expense ?? 0),
  }));

  // รวมยอดต่อหมวดฝั่ง JS เพราะ PostgREST ไม่ทำ group by ให้
  const byCategory = new Map<string, number>();
  for (const t of expenses ?? []) {
    const name = t.categories?.name ?? (locale === "en" ? "Deleted category" : "หมวดที่ถูกลบ");
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.amount));
  }
  const slices = [...byCategory].map(([name, value]) => ({ name, value }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">{t("วิเคราะห์", "Analytics")}</h1>

      <GlassCard>
        <h2 className="text-xl font-semibold">
          {t("รายจ่าย", "Expenses")} {formatPeriodTH(period, cycleStartDay, locale)}
        </h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">{t("แยกตามหมวด", "By category")}</p>
        <CategoryBreakdown rows={slices} currency={currency} />
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">{t("ยอดคงเหลือสะสม", "Cumulative balance")}</h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">
          {t("ยกยอดต่อเนื่อง 12 เดือนล่าสุด", "Balance carried across the last 12 months")}
        </p>
        <BalanceTrend rows={trend} currency={currency} cycleStartDay={cycleStartDay} />
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">{t("รายรับเทียบรายจ่าย", "Income vs expenses")}</h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">{t("รายเดือน", "Monthly")}</p>
        <IncomeExpenseBar rows={months} currency={currency} cycleStartDay={cycleStartDay} />
      </GlassCard>
    </main>
  );
}

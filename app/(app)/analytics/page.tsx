import { BalanceTrend } from "@/components/charts/balance-trend";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { IncomeExpenseBar } from "@/components/charts/income-expense-bar";
import { GlassCard } from "@/components/ui/glass-card";
import { currentPeriod, formatMonthTH, shiftPeriod } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const period = currentPeriod();
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
      .gte("occurred_on", period)
      .lt("occurred_on", shiftPeriod(period, 1)),
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
    const name = t.categories?.name ?? "หมวดที่ถูกลบ";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.amount));
  }
  const slices = [...byCategory].map(([name, value]) => ({ name, value }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">วิเคราะห์</h1>

      <GlassCard>
        <h2 className="text-xl font-semibold">
          รายจ่าย {formatMonthTH(period)}
        </h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">แยกตามหมวด</p>
        <CategoryBreakdown rows={slices} />
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">ยอดคงเหลือสะสม</h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">
          ยกยอดต่อเนื่อง 12 เดือนล่าสุด
        </p>
        <BalanceTrend rows={trend} />
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">รายรับเทียบรายจ่าย</h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">รายเดือน</p>
        <IncomeExpenseBar rows={months} />
      </GlassCard>
    </main>
  );
}

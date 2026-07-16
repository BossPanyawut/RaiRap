import Link from "next/link";
import { BudgetCard } from "@/components/budget-card";
import { BalanceTrend } from "@/components/charts/balance-trend";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { currentPeriod, formatMonthTH, shiftPeriod } from "@/lib/dates";
import { formatBaht } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const period = currentPeriod();
  const supabase = await createClient();

  const [{ data: summary }, { data: usage }, { count: totalTx }, { data: history }] =
    await Promise.all([
      supabase
        .from("v_running_balance")
        .select("*")
        .eq("period_month", period)
        .maybeSingle(),
      supabase
        .from("v_budget_usage")
        .select("*")
        .eq("period_month", period)
        .order("pct", { ascending: false }),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
      // spec §5 วาง "กราฟแนวโน้ม 6 เดือน" ไว้บน dashboard
      supabase
        .from("v_running_balance")
        .select("period_month, balance")
        .gte("period_month", shiftPeriod(period, -5))
        .order("period_month"),
    ]);

  const income = Number(summary?.income ?? 0);
  const expense = Number(summary?.expense ?? 0);

  const trend = (history ?? []).map((r) => ({
    period: r.period_month!,
    balance: Number(r.balance ?? 0),
  }));

  // dashboard แสดงเฉพาะหมวดที่ต้องสนใจ (≥80%) ตาม spec §1 "หมวดหมู่ที่ใช้เกิน"
  // งบครบทุกหมวดอยู่ที่ /budgets — docs/design-direction.md §C
  const needsAttention = (usage ?? []).filter((b) => b.status !== "ok");

  if (!totalTx) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-16 sm:p-6">
        <GlassCard className="hero-card p-0">
          <EmptyState
            title="ยังไม่มีรายการเดือนนี้ เริ่มบันทึกรายการแรก แล้วยอดคงเหลือจะขึ้นตรงนี้"
            action={<ButtonLink href="/transactions">เพิ่มรายการ</ButtonLink>}
          />
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-16 sm:p-6">
      <GlassCard className="hero-card p-8 sm:p-10">
        <h1 className="text-text-muted text-[15px]">
          ยอดคงเหลือ {formatMonthTH(period)}
        </h1>
        <p className="money mt-2 text-5xl leading-tight font-semibold sm:text-6xl">
          {formatBaht(income - expense)}
        </p>
        <p className="text-text-muted mt-3 text-[15px]">
          รายรับ <span className="tabular">{formatBaht(income)}</span> · รายจ่าย{" "}
          <span className="tabular">{formatBaht(expense)}</span>
        </p>
        {summary && Number(summary.balance) !== income - expense && (
          <p className="text-text-muted mt-1 text-sm">
            รวมยอดยกมาจากเดือนก่อน{" "}
            <span className="tabular">{formatBaht(Number(summary.balance))}</span>
          </p>
        )}
      </GlassCard>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xl font-semibold">หมวดที่ต้องดู</h2>
          <Link href="/budgets" className="text-accent-deep text-sm underline">
            ดูงบทั้งหมด
          </Link>
        </div>

        {needsAttention.length === 0 ? (
          // ไม่มีหมวดไหนเกิน 80% = ข่าวดี ไม่ใช่ empty state — น้ำเสียงจึงเรียบ
          <GlassCard className="p-5">
            <p className="text-[15px]">ทุกหมวดยังอยู่ในงบ</p>
            <p className="text-text-muted mt-1 text-sm">
              {usage?.length
                ? "ถ้าหมวดไหนใช้ถึง 80% ของวงเงิน จะขึ้นเตือนตรงนี้"
                : "ยังไม่ได้ตั้งงบไว้ ตั้งงบแล้วระบบจะเตือนเมื่อใกล้เต็มวงเงิน"}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {needsAttention.map((b) => (
              <BudgetCard key={b.category_id} usage={b} />
            ))}
          </div>
        )}
      </section>

      {trend.length >= 2 && (
        <GlassCard>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">แนวโน้มยอดคงเหลือ</h2>
            <Link href="/analytics" className="text-accent-deep text-sm underline">
              ดูวิเคราะห์
            </Link>
          </div>
          <BalanceTrend rows={trend} />
        </GlassCard>
      )}
    </main>
  );
}

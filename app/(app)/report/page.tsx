import { z } from "zod";
import { PrintButton } from "@/components/print-button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  currentPeriod,
  formatDateTH,
  formatPeriodTH,
  periodRange,
  shiftPeriod,
  todayISO,
} from "@/lib/dates";
import { forecast } from "@/lib/forecast";
import { getI18n } from "@/lib/i18n-server";
import { localizeDefaultName } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { getCategorySpend } from "@/lib/period-data";
import { getSettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { currency, cycleStartDay, displayName } = (await getSettings())!;
  const { locale, t } = await getI18n();
  const raw = await searchParams;
  const period =
    z.iso
      .date()
      .refine((d) => d.endsWith("-01"))
      .safeParse(raw.period).data ?? currentPeriod(cycleStartDay);

  const range = periodRange(period, cycleStartDay);
  const supabase = await createClient();

  const [{ data: summary }, { data: usage }, { data: rows }, categories] =
    await Promise.all([
      supabase
        .from("v_running_balance")
        .select("income, expense, net, balance")
        .eq("period_month", period)
        .maybeSingle(),
      supabase
        .from("v_budget_usage")
        .select("category_name, budget_amount, spent, pct, status")
        .eq("period_month", period)
        .order("pct", { ascending: false }),
      supabase
        .from("transactions")
        .select("occurred_on, kind, amount, note, categories(name), accounts(name)")
        .gte("occurred_on", range.from)
        .lte("occurred_on", range.to)
        .order("occurred_on"),
      getCategorySpend(period, cycleStartDay),
    ]);

  const income = Number(summary?.income ?? 0);
  const expense = Number(summary?.expense ?? 0);
  const f = forecast(period, cycleStartDay, income, expense);

  const over = (usage ?? []).filter((u) => u.status === "over");
  const warn = (usage ?? []).filter((u) => u.status === "warn");
  const label = formatPeriodTH(period, cycleStartDay, locale);

  if (!rows?.length) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
        <h1 className="px-1 text-2xl font-semibold">{t("รายงาน", "Report")} {label}</h1>
        <GlassCard className="p-0">
          <EmptyState title={t("รอบนี้ยังไม่มีรายการ ไม่มีอะไรให้สรุป", "No transactions in this cycle to summarize")} />
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <div className="no-print flex items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-semibold">{t("รายงาน", "Report")} {label}</h1>
          <p className="text-text-muted mt-1 text-sm">
            {t("กดพิมพ์แล้วเลือก “บันทึกเป็น PDF” ในหน้าต่างที่ขึ้นมา", "Choose Print, then select “Save as PDF” in the print dialog.")}
          </p>
        </div>
        <PrintButton />
      </div>

      <nav className="no-print flex gap-2 px-1" aria-label={t("เลือกรอบ", "Choose cycle")}>
        <a href={`/report?period=${shiftPeriod(period, -1)}`} className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover">
          ← {formatPeriodTH(shiftPeriod(period, -1), cycleStartDay, locale)}
        </a>
        <a href={`/report?period=${shiftPeriod(period, 1)}`} className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover">
          {formatPeriodTH(shiftPeriod(period, 1), cycleStartDay, locale)} →
        </a>
      </nav>

      {/* หัวกระดาษ — เห็นเฉพาะตอนพิมพ์ ไฟล์ PDF ต้องบอกได้ว่าเป็นของใคร รอบไหน */}
      <header className="print-only mb-4">
        <h1 className="text-2xl font-semibold">{t("รายงานรายรับ-รายจ่าย", "Income and expense report")}</h1>
        <p className="text-text-muted mt-1 text-[15px]">
          {label}
          {displayName && ` · ${displayName}`} · {t("ออกเมื่อ", "Generated")} {formatDateTH(todayISO(), true, locale)}
        </p>
      </header>

      <GlassCard className="p-5">
        <h2 className="text-xl font-semibold">{t("สรุปรอบ", "Cycle summary")}</h2>
        <table className="mt-3 w-full text-[15px]">
          <tbody>
            {[
              [t("รายรับ", "Income"), income],
              [t("รายจ่าย", "Expenses"), expense],
              [t("คงเหลือรอบนี้", "Cycle balance"), income - expense],
              [t("ยอดสะสมยกมา", "Carried balance"), Number(summary?.balance ?? 0)],
            ].map(([k, v]) => (
              <tr key={k as string} className="border-glass-border border-b last:border-0">
                <td className="py-2">{k}</td>
                <td className="tabular py-2 text-right font-mono">
                  {formatMoney(v as number, currency, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* สรุปจบเดือนตาม spec 2.3 — บอกตรง ๆ ไม่ตำหนิ */}
        <p className="mt-4 text-[15px]">
          {over.length === 0 && warn.length === 0
            ? t("รอบนี้ทุกหมวดอยู่ในงบ", "All categories are within budget this cycle")
            : locale === "th" ? `รอบนี้ใช้เกินงบ ${over.length} หมวด และใกล้เต็มวงเงินอีก ${warn.length} หมวด` : `${over.length} categories are over budget and ${warn.length} are close to their limits.`}
          {!f.isPast && f.daysGone > 0 && (
            <>
              {" "}{t("ผ่านมา", "Day")} {f.daysGone} {t("จาก", "of")} {f.daysTotal}. {t("วัน ถ้าใช้อัตราเดิมต่อไป ปลายรอบจะเหลือราว", "At the current rate, the projected end balance is")}{" "}
              <span className="tabular">{formatMoney(f.projectedBalance, currency)}</span>
            </>
          )}
        </p>
        {categories.length > 0 && (
          <p className="text-text-muted mt-2 text-[15px]">
            {t("หมวดที่ใช้มากที่สุดคือ", "Highest-spending category:")} {localizeDefaultName(locale, categories[0].name)}{" "}
            <span className="tabular">{formatMoney(categories[0].spent, currency)}</span>{" "}
            {t("คิดเป็น", "representing")} {Math.round((categories[0].spent / Math.max(expense, 1)) * 100)}% {t("ของรายจ่ายทั้งรอบ", "of cycle expenses")}
          </p>
        )}
      </GlassCard>

      {(usage?.length ?? 0) > 0 && (
        <GlassCard className="p-5">
          <h2 className="text-xl font-semibold">{t("งบแต่ละหมวด", "Category budgets")}</h2>
          <table className="mt-3 w-full text-[15px]">
            <thead>
              <tr className="text-text-muted border-glass-border border-b text-left text-sm">
                <th className="py-2 font-medium">{t("หมวด", "Category")}</th>
                <th className="py-2 text-right font-medium">{t("งบ", "Budget")}</th>
                <th className="py-2 text-right font-medium">{t("ใช้ไป", "Spent")}</th>
                <th className="py-2 text-right font-medium">{t("คิดเป็น", "Share")}</th>
              </tr>
            </thead>
            <tbody>
              {usage!.map((u) => (
                <tr key={u.category_name} className="border-glass-border border-b last:border-0">
                  <td className="py-2">
                    {localizeDefaultName(locale, u.category_name ?? t("หมวดที่ถูกลบ", "Deleted category"))}
                    {/* สถานะต้องอ่านออกบนกระดาษขาวดำ — สีอย่างเดียวใช้ไม่ได้ */}
                    {u.status === "over" && ` (${t("เกินงบ", "over budget")})`}
                    {u.status === "warn" && ` (${t("ใกล้เต็ม", "near limit")})`}
                  </td>
                  <td className="tabular py-2 text-right font-mono">
                    {formatMoney(Number(u.budget_amount), currency)}
                  </td>
                  <td className="tabular py-2 text-right font-mono">
                    {formatMoney(Number(u.spent), currency)}
                  </td>
                  <td className="tabular py-2 text-right">{Math.round(Number(u.pct))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <h2 className="text-xl font-semibold">{t("รายการทั้งหมด", "All transactions")} ({rows.length})</h2>
        <table className="mt-3 w-full text-[15px]">
          <thead>
            <tr className="text-text-muted border-glass-border border-b text-left text-sm">
              <th className="py-2 font-medium">{t("วันที่", "Date")}</th>
              <th className="py-2 font-medium">{t("หมวด", "Category")}</th>
              <th className="py-2 text-right font-medium">{t("จำนวนเงิน", "Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={i} className="border-glass-border border-b last:border-0">
                <td className="tabular py-2 whitespace-nowrap">{formatDateTH(t.occurred_on, true, locale)}</td>
                <td className="py-2">
                  {t.categories?.name ? localizeDefaultName(locale, t.categories.name) : (locale === "th" ? "หมวดที่ถูกลบ" : "Deleted category")}
                  {t.note && <span className="text-text-muted"> · {t.note}</span>}
                  {t.accounts && <span className="text-text-muted"> · {t.accounts.name}</span>}
                </td>
                <td className="tabular py-2 text-right font-mono whitespace-nowrap">
                  {t.kind === "income" ? "+" : "−"}
                  {formatMoney(Number(t.amount), currency, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </main>
  );
}

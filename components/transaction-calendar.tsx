"use client";

import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";
import {
  formatDateTH,
  formatPeriodTH,
  transactionPeriodRange,
  type TransactionPeriodScope,
} from "@/lib/dates";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/cn";

export type CalendarSummary = {
  bucket_start: string;
  income: number;
  expense: number;
  net: number;
  transaction_count: number;
};

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function compactAmount(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function compactMoney(amount: number, currency: Currency): string {
  return `${CURRENCIES[currency].symbol}\u00a0${compactAmount(amount)}`;
}

function destination(
  query: Record<string, string | undefined>,
  values: Record<string, string>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  params.delete("page");
  params.delete("from");
  params.delete("to");
  for (const [key, value] of Object.entries(values)) params.set(key, value);
  return `/transactions?${params}`;
}

function Amounts({ summary, currency }: { summary?: CalendarSummary; currency: Currency }) {
  const { t } = useLocale();
  if (!summary) return <span className="text-text-muted text-xs" aria-hidden="true">—</span>;

  return (
    <span className="flex flex-col items-start leading-tight">
      {summary.income > 0 && (
        <span
          className="money text-income-text text-[11px] font-medium sm:text-xs"
          title={`${t("รายรับ", "Income")} ${formatMoney(summary.income, currency, true)}`}
          data-income-amount
        >
          <span className="sm:hidden">+{compactAmount(summary.income)}</span>
          <span className="hidden sm:inline">+{compactMoney(summary.income, currency)}</span>
        </span>
      )}
      {summary.expense > 0 && (
        <span
          className="money text-expense-text text-[11px] font-medium sm:text-xs"
          title={`${t("รายจ่าย", "Expenses")} ${formatMoney(summary.expense, currency, true)}`}
          data-expense-amount
        >
          <span className="sm:hidden">−{compactAmount(summary.expense)}</span>
          <span className="hidden sm:inline">−{compactMoney(summary.expense, currency)}</span>
        </span>
      )}
      <span className="text-text-muted mt-1 text-[11px]">
        <span className="sm:hidden">{summary.transaction_count}</span>
        <span className="hidden sm:inline">{summary.transaction_count} {t("รายการ", "transactions")}</span>
      </span>
    </span>
  );
}

function DayGrid({
  dates,
  summaries,
  currency,
  query,
  leadingBlanks = 0,
}: {
  dates: string[];
  summaries: Map<string, CalendarSummary>;
  currency: Currency;
  query: Record<string, string | undefined>;
  leadingBlanks?: number;
}) {
  const { locale, t } = useLocale();
  const weekdayLabels = locale === "en"
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  return (
    <div className="grid grid-cols-7 gap-px sm:gap-1.5">
      {weekdayLabels.map((label) => (
        <div key={label} className="text-text-muted py-1 text-center text-xs font-medium">
          {label}
        </div>
      ))}
      {Array.from({ length: leadingBlanks }, (_, index) => (
        <div key={`blank-${index}`} aria-hidden="true" />
      ))}
      {dates.map((date) => {
        const summary = summaries.get(date);
        const label = [
          formatDateTH(date, true, locale),
          summary ? `${summary.transaction_count} ${t("รายการ", "transactions")}` : t("ไม่มีรายการ", "No transactions"),
          summary?.income ? `${t("รายรับ", "Income")} ${formatMoney(summary.income, currency, true)}` : "",
          summary?.expense ? `${t("รายจ่าย", "Expenses")} ${formatMoney(summary.expense, currency, true)}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Link
            key={date}
            href={destination(query, { view: "list", scope: "day", at: date })}
            aria-label={label}
            className="min-h-20 min-w-0 rounded-xl bg-input p-1.5 hover:bg-hover sm:min-h-28 sm:rounded-2xl sm:p-2"
          >
            <span className="tabular mb-2 block text-sm font-medium">
              {Number(date.slice(8, 10))}
            </span>
            <Amounts summary={summary} currency={currency} />
          </Link>
        );
      })}
    </div>
  );
}

export function TransactionCalendar({
  scope,
  anchor,
  summaries,
  currency,
  query,
}: {
  scope: TransactionPeriodScope;
  anchor: string;
  summaries: CalendarSummary[];
  currency: Currency;
  query: Record<string, string | undefined>;
}) {
  const { locale, t } = useLocale();
  const range = transactionPeriodRange(anchor, scope);
  const byDate = new Map(summaries.map((summary) => [summary.bucket_start, summary]));

  if (scope === "day") {
    const summary = byDate.get(anchor);
    return (
      <GlassCard className="p-5" data-calendar-view="day">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-text-muted text-sm">{t("ปฏิทินรายวัน", "Daily calendar")}</p>
            <h2 className="text-xl font-semibold">{formatDateTH(anchor, true, locale)}</h2>
          </div>
          <Link
            href={destination(query, { view: "list", scope: "day", at: anchor })}
            className="text-link min-h-11 rounded-full px-3 py-2 text-sm hover:bg-hover"
          >
            {t("ดูรายการของวันนี้", "View today's transactions")}
          </Link>
        </div>
        {summary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t("รายรับ", "Income"), amount: summary.income, sign: "+", kind: "income" },
              { label: t("รายจ่าย", "Expenses"), amount: summary.expense, sign: "−", kind: "expense" },
              {
                label: t("สุทธิ", "Net"),
                amount: Math.abs(summary.net),
                sign: summary.net >= 0 ? "+" : "−",
                kind: summary.net >= 0 ? "income" : "expense",
              },
            ].map(({ label, amount, sign, kind }) => (
              <div key={label} className="rounded-2xl bg-input p-4">
                <p className="text-text-muted text-sm">{label}</p>
                <p
                  className={cn(
                    "money mt-1 text-lg font-medium",
                    kind === "income" ? "text-income-text" : "text-expense-text",
                  )}
                >
                  {sign}{formatMoney(amount, currency, true)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted rounded-2xl bg-input p-5">
            {t("วันนี้ยังไม่มีรายการ ใช้ปุ่มเพิ่มรายการเพื่อเริ่มบันทึก", "No transactions today. Use Add transaction to start recording.")}
          </p>
        )}
      </GlassCard>
    );
  }

  if (scope === "year") {
    const year = Number(anchor.slice(0, 4));
    return (
      <GlassCard className="p-4 sm:p-5" data-calendar-view="year">
        <div className="mb-4">
          <p className="text-text-muted text-sm">{t("ปฏิทินรายปี", "Yearly calendar")}</p>
          <h2 className="text-xl font-semibold">{t("ปี", "Year")} {locale === "th" ? year + 543 : year}</h2>
          <p className="text-text-muted text-sm">{t("เลือกเดือนเพื่อดูรายละเอียดรายวัน", "Choose a month to view daily details")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, index) => {
            const month = `${year}-${String(index + 1).padStart(2, "0")}-01`;
            const summary = byDate.get(month);
            return (
              <Link
                key={month}
                href={destination(query, { view: "calendar", scope: "month", at: month })}
                className="min-h-28 rounded-2xl bg-input p-3 hover:bg-hover"
              >
                <span className="mb-2 block text-sm font-medium">
                  {formatPeriodTH(month, 1, locale).replace(` ${locale === "th" ? year + 543 : year}`, "")}
                </span>
                <Amounts summary={summary} currency={currency} />
              </Link>
            );
          })}
        </div>
      </GlassCard>
    );
  }

  const dates = datesBetween(range.from, range.to);
  const leadingBlanks =
    scope === "month"
      ? (new Date(`${range.from}T00:00:00Z`).getUTCDay() + 6) % 7
      : 0;
  return (
    <GlassCard className="p-1 sm:p-5" data-calendar-view={scope}>
      <div className="mb-4 px-3 pt-3 sm:px-1 sm:pt-0">
        <p className="text-text-muted text-sm">
          {scope === "week" ? t("ปฏิทินรายสัปดาห์", "Weekly calendar") : t("ปฏิทินรายเดือน", "Monthly calendar")}
        </p>
        <h2 className="text-lg font-semibold">
          {scope === "week"
            ? `${formatDateTH(range.from, true, locale)} – ${formatDateTH(range.to, true, locale)}`
            : formatPeriodTH(`${anchor.slice(0, 7)}-01`, 1, locale)}
        </h2>
        <p className="text-text-muted text-sm">{t("เลือกวันเพื่อดูรายการในวันนั้น", "Choose a day to view its transactions")}</p>
      </div>
      <DayGrid
        dates={dates}
        summaries={byDate}
        currency={currency}
        query={query}
        leadingBlanks={leadingBlanks}
      />
    </GlassCard>
  );
}

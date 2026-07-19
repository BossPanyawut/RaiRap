"use client";

import Link from "next/link";
import { useActionState } from "react";
import { copyLastMonth, setBudget, type BudgetState } from "@/app/(app)/budgets/actions";
import type { BudgetUsage } from "@/components/budget-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPeriodTH } from "@/lib/dates";
import type { Currency } from "@/lib/money";
import { localizeDefaultName } from "@/lib/locale";

type Row = { categoryId: string; name: string; usage: BudgetUsage | null };

function BudgetRow({
  row,
  period,
  currency,
}: {
  row: Row;
  period: string;
  currency: Currency;
}) {
  const { locale, t } = useLocale();
  const [state, action, pending] = useActionState<BudgetState, FormData>(
    setBudget,
    null,
  );

  const spent = Number(row.usage?.spent ?? 0);
  const budget = Number(row.usage?.budget_amount ?? 0);

  return (
    <GlassCard className="p-5">
      {row.usage ? (
        <ProgressBar
          label={localizeDefaultName(locale, row.name)}
          spent={spent}
          budget={budget}
          currency={currency}
        />
      ) : (
        <p className="text-[15px]">{localizeDefaultName(locale, row.name)}</p>
      )}

      <form action={action} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="categoryId" value={row.categoryId} />
        <input type="hidden" name="period" value={period} />

        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="text-text-muted">{t("วงเงินต่อเดือน", "Monthly limit")}</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={row.usage ? budget : ""}
            placeholder={t("ไม่ตั้งงบ", "No budget")}
            aria-label={`${t("วงเงินต่อเดือนของหมวด", "Monthly limit for")} ${localizeDefaultName(locale, row.name)}`}
            className="border-glass-border tabular rounded-2xl border bg-input px-4 py-2 text-base sm:text-[15px]"
          />
        </label>

        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className="px-4 py-2 text-sm"
        >
          {pending ? t("กำลังบันทึก", "Saving") : t("บันทึก", "Save")}
        </Button>
      </form>

      {state && "error" in state && <Alert className="mt-3">{state.error}</Alert>}
    </GlassCard>
  );
}

export function BudgetEditor({
  period,
  prevPeriod,
  nextPeriod,
  rows,
  currency,
  cycleStartDay,
}: {
  period: string;
  prevPeriod: string;
  nextPeriod: string;
  rows: Row[];
  currency: Currency;
  cycleStartDay: number;
}) {
  const { locale, t } = useLocale();
  const [copyState, copyAction, copying] = useActionState<BudgetState, FormData>(
    copyLastMonth,
    null,
  );

  return (
    <>
      <nav className="flex items-center gap-2" aria-label={t("เลือกเดือน", "Choose month")}>
        <Link
          href={`/budgets?period=${prevPeriod}`}
          className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
        >
          ← {formatPeriodTH(prevPeriod, cycleStartDay, locale)}
        </Link>
        <Link
          href={`/budgets?period=${nextPeriod}`}
          className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
        >
          {formatPeriodTH(nextPeriod, cycleStartDay, locale)} →
        </Link>

        <form action={copyAction} className="ml-auto">
          <input type="hidden" name="period" value={period} />
          <Button
            type="submit"
            variant="secondary"
            disabled={copying}
            className="px-4 py-2 text-sm"
          >
            {copying ? t("กำลังคัดลอก", "Copying") : t("คัดลอกงบเดือนก่อน", "Copy previous budgets")}
          </Button>
        </form>
      </nav>

      {copyState && "error" in copyState && <Alert>{copyState.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <BudgetRow key={r.categoryId} row={r} period={period} currency={currency} />
        ))}
      </div>
    </>
  );
}

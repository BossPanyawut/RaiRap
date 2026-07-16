"use client";

import Link from "next/link";
import { useActionState } from "react";
import { copyLastMonth, setBudget, type BudgetState } from "@/app/(app)/budgets/actions";
import type { BudgetUsage } from "@/components/budget-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMonthTH } from "@/lib/dates";

type Row = { categoryId: string; name: string; usage: BudgetUsage | null };

function BudgetRow({ row, period }: { row: Row; period: string }) {
  const [state, action, pending] = useActionState<BudgetState, FormData>(
    setBudget,
    null,
  );

  const spent = Number(row.usage?.spent ?? 0);
  const budget = Number(row.usage?.budget_amount ?? 0);

  return (
    <GlassCard className="p-5">
      {row.usage ? (
        <ProgressBar label={row.name} spent={spent} budget={budget} />
      ) : (
        <p className="text-[15px]">{row.name}</p>
      )}

      <form action={action} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="categoryId" value={row.categoryId} />
        <input type="hidden" name="period" value={period} />

        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="text-text-muted">วงเงินต่อเดือน</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={row.usage ? budget : ""}
            placeholder="ไม่ตั้งงบ"
            aria-label={`วงเงินต่อเดือนของหมวด${row.name}`}
            className="border-glass-border tabular rounded-2xl border bg-white/60 px-4 py-2 text-[15px]"
          />
        </label>

        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className="px-4 py-2 text-sm"
        >
          {pending ? "กำลังบันทึก" : "บันทึก"}
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
}: {
  period: string;
  prevPeriod: string;
  nextPeriod: string;
  rows: Row[];
}) {
  const [copyState, copyAction, copying] = useActionState<BudgetState, FormData>(
    copyLastMonth,
    null,
  );

  return (
    <>
      <nav className="flex items-center gap-2" aria-label="เลือกเดือน">
        <Link
          href={`/budgets?period=${prevPeriod}`}
          className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
        >
          ← {formatMonthTH(prevPeriod)}
        </Link>
        <Link
          href={`/budgets?period=${nextPeriod}`}
          className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
        >
          {formatMonthTH(nextPeriod)} →
        </Link>

        <form action={copyAction} className="ml-auto">
          <input type="hidden" name="period" value={period} />
          <Button
            type="submit"
            variant="secondary"
            disabled={copying}
            className="px-4 py-2 text-sm"
          >
            {copying ? "กำลังคัดลอก" : "คัดลอกงบเดือนก่อน"}
          </Button>
        </form>
      </nav>

      {copyState && "error" in copyState && <Alert>{copyState.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <BudgetRow key={r.categoryId} row={r} period={period} />
        ))}
      </div>
    </>
  );
}

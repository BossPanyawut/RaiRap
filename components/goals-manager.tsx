"use client";

import { useActionState } from "react";
import { createGoal, deleteGoal, type GoalState } from "@/app/(app)/goals/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocale } from "@/components/locale-provider";
import { formatDateTH } from "@/lib/dates";
import { suggestCuts, type CategorySpend } from "@/lib/forecast";
import { formatMoney, type Currency } from "@/lib/money";

export type Goal = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
};

function GoalCard({
  goal,
  monthlyNet,
  categories,
  currency,
}: {
  goal: Goal;
  monthlyNet: number;
  categories: CategorySpend[];
  currency: Currency;
}) {
  const { locale, t } = useLocale();
  const target = Number(goal.target_amount);

  // เดือนที่เหลือถึงกำหนด — ไม่มีกำหนดก็คำนวณไม่ได้ ไม่เดาให้
  const monthsLeft = goal.target_date
    ? Math.max(
        (new Date(goal.target_date).getFullYear() - new Date().getFullYear()) * 12 +
          (new Date(goal.target_date).getMonth() - new Date().getMonth()),
        0,
      )
    : null;

  const needPerMonth = monthsLeft && monthsLeft > 0 ? target / monthsLeft : null;
  const gap = needPerMonth !== null ? needPerMonth - monthlyNet : null;
  const onTrack = gap !== null && gap <= 0;
  const cuts = gap !== null && gap > 0 ? suggestCuts(categories, gap) : [];

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium">{goal.name}</h3>
          <p className="money mt-1 text-2xl font-semibold">
            {formatMoney(target, currency)}
          </p>
          {goal.target_date && (
            <p className="text-text-muted mt-1 text-sm">
              {t("ภายใน", "By")} {formatDateTH(goal.target_date, true, locale)}
              {monthsLeft !== null && ` · ${t("เหลือ", "in")} ${monthsLeft} ${t("เดือน", "months")}`}
            </p>
          )}
        </div>
        <form action={deleteGoal}>
          <input type="hidden" name="id" value={goal.id} />
          <button
            type="submit"
            className="text-text-muted shrink-0 rounded-full px-3 py-1.5 text-sm hover:bg-hover"
          >
            {t("ลบ", "Delete")}
          </button>
        </form>
      </div>

      <div className="border-glass-border mt-4 border-t pt-4">
        {monthsLeft === null ? (
          <p className="text-text-muted text-[15px]">
            {t("ใส่วันที่เป้าหมายเพื่อให้คำนวณว่าต้องเก็บเดือนละเท่าไหร่", "Add a target date to calculate the monthly saving required.")}
          </p>
        ) : monthsLeft === 0 ? (
          <p className="text-[15px]">{t("ถึงกำหนดแล้ว", "Due now")}</p>
        ) : (
          <>
            <p className="text-[15px]">
              {t("ต้องเก็บเดือนละ", "Save per month")}{" "}
              <span className="tabular font-medium">
                {formatMoney(needPerMonth!, currency)}
              </span>
            </p>
            <p className="text-text-muted mt-1 text-sm">
              {t("ตอนนี้เหลือเดือนละ", "Current monthly balance")}{" "}
              <span className="tabular">{formatMoney(monthlyNet, currency)}</span>
            </p>

            {onTrack ? (
              <p className="mt-3 text-[15px]">{t("อัตราปัจจุบันถึงเป้าได้", "Your current rate is on track")}</p>
            ) : (
              <>
                <p className="mt-3 text-[15px]">
                  {t("ยังขาดเดือนละ", "Monthly shortfall")}{" "}
                  <span className="tabular font-medium">
                    {formatMoney(gap!, currency)}
                  </span>
                </p>
                {cuts.length > 0 && (
                  <>
                    <p className="text-text-muted mt-2 text-sm">
                      {t("ลดตามสัดส่วนที่ใช้จริง หมวดที่ใช้เยอะรับภาระมากกว่า", "Suggested cuts are proportional to actual spending.")}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {cuts.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-baseline justify-between gap-2 text-[15px]"
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="tabular text-text-muted shrink-0 text-sm">
                            {t("ลด", "Cut")} {formatMoney(c.cut, currency)} ({Math.round(c.pct)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}

export function GoalsManager({
  goals,
  monthlyNet,
  categories,
  currency,
}: {
  goals: Goal[];
  monthlyNet: number;
  categories: CategorySpend[];
  currency: Currency;
}) {
  const { t } = useLocale();
  const [state, action, pending] = useActionState<GoalState, FormData>(createGoal, null);

  return (
    <>
      <GlassCard className="p-5">
        <h2 className="text-xl font-semibold">{t("เพิ่มเป้าหมาย", "Add goal")}</h2>
        <form action={action} className="mt-4 flex flex-col gap-4">
          <Field id="name" name="name" label={t("เป้าหมาย", "Goal")} placeholder={t("เช่น ทริปญี่ปุ่น", "e.g. Japan trip")} maxLength={60} required />
          <Field
            id="targetAmount"
            name="targetAmount"
            label={t("ต้องเก็บให้ได้", "Target amount")}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            className="money"
            required
          />
          <Field id="targetDate" name="targetDate" label={t("ภายในวันที่", "Target date")} type="date" hint={t("ไม่ใส่ก็ได้ แต่ใส่แล้วจะคำนวณให้ว่าต้องเก็บเดือนละเท่าไหร่", "Optional. Add a date to calculate the monthly saving required.")} />
          {state && "error" in state && <Alert>{state.error}</Alert>}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? t("กำลังบันทึก", "Saving") : t("บันทึก", "Save")}
          </Button>
        </form>
      </GlassCard>

      {goals.length === 0 ? (
        <GlassCard className="p-0">
          <EmptyState title={t("ยังไม่มีเป้าหมาย ตั้งสักอันแล้วระบบจะบอกว่าต้องเก็บเดือนละเท่าไหร่", "No goals yet. Add one to see how much to save each month.")} />
        </GlassCard>
      ) : (
        goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            monthlyNet={monthlyNet}
            categories={categories}
            currency={currency}
          />
        ))
      )}
    </>
  );
}

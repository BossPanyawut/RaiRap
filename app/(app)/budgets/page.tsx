import { z } from "zod";
import { BudgetEditor } from "@/components/budget-editor";
import { currentPeriod, formatPeriodTH, shiftPeriod } from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { currency, cycleStartDay } = (await getSettings())!;
  const { locale, t } = await getI18n();
  const raw = await searchParams;
  const period =
    z.iso
      .date()
      .refine((d) => d.endsWith("-01"))
      .safeParse(raw.period).data ?? currentPeriod(cycleStartDay);

  const supabase = await createClient();

  const [{ data: categories }, { data: usage }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("sort_order"),
    supabase.from("v_budget_usage").select("*").eq("period_month", period),
  ]);

  const byCategory = new Map((usage ?? []).map((u) => [u.category_id, u]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">
        {t("งบ", "Budgets")} {formatPeriodTH(period, cycleStartDay, locale)}
      </h1>

      <BudgetEditor
        currency={currency}
        cycleStartDay={cycleStartDay}
        period={period}
        prevPeriod={shiftPeriod(period, -1)}
        nextPeriod={shiftPeriod(period, 1)}
        rows={(categories ?? []).map((c) => ({
          categoryId: c.id,
          name: c.name,
          usage: byCategory.get(c.id) ?? null,
        }))}
      />
    </main>
  );
}

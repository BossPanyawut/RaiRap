"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Database } from "@/lib/database.types";
import type { Currency } from "@/lib/money";
import { localizeDefaultName } from "@/lib/locale";

export type BudgetUsage = Database["public"]["Views"]["v_budget_usage"]["Row"];

export function BudgetCard({
  usage,
  currency,
}: {
  usage: BudgetUsage;
  currency: Currency;
}) {
  const { locale, t } = useLocale();
  return (
    <GlassCard className="p-5">
      <ProgressBar
        label={usage.category_name ? localizeDefaultName(locale, usage.category_name) : t("หมวดที่ถูกลบ", "Deleted category")}
        spent={Number(usage.spent ?? 0)}
        budget={Number(usage.budget_amount ?? 0)}
        currency={currency}
      />
    </GlassCard>
  );
}

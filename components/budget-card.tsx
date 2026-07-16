import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Database } from "@/lib/database.types";

export type BudgetUsage = Database["public"]["Views"]["v_budget_usage"]["Row"];

export function BudgetCard({ usage }: { usage: BudgetUsage }) {
  return (
    <GlassCard className="p-5">
      <ProgressBar
        label={usage.category_name ?? "หมวดที่ถูกลบ"}
        spent={Number(usage.spent ?? 0)}
        budget={Number(usage.budget_amount ?? 0)}
      />
    </GlassCard>
  );
}

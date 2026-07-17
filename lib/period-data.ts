import { cache } from "react";
import { periodRange } from "@/lib/dates";
import type { CategorySpend } from "@/lib/forecast";
import { createClient } from "@/lib/supabase/server";

/**
 * รายจ่ายแยกตามหมวดในรอบที่ระบุ — PostgREST ไม่ทำ group by ให้ จึงรวมฝั่ง JS
 * `cache()` ดีดูปคำขอเดียวกัน (dashboard เรียกทั้ง what-if และ forecast)
 */
export const getCategorySpend = cache(
  async (period: string, cycleStartDay: number): Promise<CategorySpend[]> => {
    const range = periodRange(period, cycleStartDay);
    const supabase = await createClient();

    const { data } = await supabase
      .from("transactions")
      .select("amount, category_id, categories(name)")
      .eq("kind", "expense")
      .gte("occurred_on", range.from)
      .lte("occurred_on", range.to);

    const by = new Map<string, CategorySpend>();
    for (const t of data ?? []) {
      const key = t.category_id;
      const row = by.get(key);
      if (row) row.spent += Number(t.amount);
      else
        by.set(key, {
          id: key,
          name: t.categories?.name ?? "หมวดที่ถูกลบ",
          spent: Number(t.amount),
        });
    }

    return [...by.values()].sort((a, b) => b.spent - a.spent);
  },
);

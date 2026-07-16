import { cache } from "react";
import { currentPeriod } from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type Alert = {
  categoryId: string;
  categoryName: string;
  periodMonth: string;
  threshold: 80 | 100;
  spent: number;
  budget: number;
  pct: number;
};

/**
 * แจ้งเตือนไม่ได้เก็บเป็นแถว — คำนวณสดจาก v_budget_usage ทุกครั้ง
 * เก็บแค่ "อันไหนที่ผู้ใช้ปิดไปแล้ว" ใน dismissed_alerts
 *
 * ผลที่ได้: ไม่ต้องมี cron ไม่มีงานเบื้องหลัง และถ้าผู้ใช้ลบรายการจนยอดหลุด
 * ขอบ 80% การแจ้งเตือนหายเองทันที ไม่มีทางค้างบอกเรื่องที่ไม่จริงแล้ว
 */
export const getAlerts = cache(async (): Promise<Alert[]> => {
  const settings = await getSettings();
  if (!settings) return [];

  const period = currentPeriod(settings.cycleStartDay);
  const supabase = await createClient();

  const [{ data: usage }, { data: dismissed }] = await Promise.all([
    supabase
      .from("v_budget_usage")
      .select("category_id, category_name, period_month, spent, budget_amount, pct, status")
      .eq("period_month", period)
      .neq("status", "ok"),
    supabase
      .from("dismissed_alerts")
      .select("category_id, threshold")
      .eq("period_month", period),
  ]);

  const isDismissed = new Set(
    (dismissed ?? []).map((d) => `${d.category_id}:${d.threshold}`),
  );

  const alerts: Alert[] = [];
  for (const u of usage ?? []) {
    if (!u.category_id) continue;
    // ขอบสูงสุดที่ข้ามไปแล้วเท่านั้น — ที่ 105% ไม่ต้องเตือนซ้ำทั้ง 80 และ 100
    const threshold: 80 | 100 = u.status === "over" ? 100 : 80;
    if (isDismissed.has(`${u.category_id}:${threshold}`)) continue;
    alerts.push({
      categoryId: u.category_id,
      categoryName: u.category_name ?? "หมวดที่ถูกลบ",
      periodMonth: u.period_month!,
      threshold,
      spent: Number(u.spent ?? 0),
      budget: Number(u.budget_amount ?? 0),
      pct: Number(u.pct ?? 0),
    });
  }

  return alerts.sort((a, b) => b.pct - a.pct);
});

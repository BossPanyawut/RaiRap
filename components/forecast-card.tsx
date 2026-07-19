"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";
import type { Forecast } from "@/lib/forecast";
import { formatMoney, type Currency } from "@/lib/money";

/** พยากรณ์ปลายรอบ (spec 2.3) */
export function ForecastCard({
  forecast: f,
  currency,
}: {
  forecast: Forecast;
  currency: Currency;
}) {
  const { t } = useLocale();
  if (f.daysGone === 0 || f.isPast) return null;

  const tight = f.projectedBalance < 0;

  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-semibold">{t("ถ้าใช้อัตรานี้ต่อไป", "At your current rate")}</h2>

      <p className="money mt-2 text-3xl font-semibold">
        {formatMoney(f.projectedBalance, currency)}
      </p>
      <p className="text-text-muted mt-1 text-sm">{t("ยอดคงเหลือปลายรอบ", "Projected end-of-cycle balance")}</p>

      {/* แสดงวิธีคิดให้เห็น ไม่ใช่โยนตัวเลขที่เถียงไม่ได้ใส่หน้า */}
      <p className="text-text-muted mt-3 text-[15px]">
        {t("ผ่านมา", "Day")} {f.daysGone} {t("จาก", "of")} {f.daysTotal} {t("วัน ใช้เฉลี่ยวันละ", "— average daily spending")}{" "}
        <span className="tabular">{formatMoney(f.burnPerDay, currency)}</span>{" "}
        {t("เหลืออีก", "with")} {f.daysLeft} {t("วัน", "days left")}
      </p>

      {tight && (
        <p className="mt-2 flex items-start gap-1.5 text-[15px]">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="mt-1 size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" />
            <path d="M8 6.75v2.5" />
            <path d="M8 11.75h.01" />
          </svg>
          <span>
            {t("อัตรานี้จะทำให้ปลายรอบติดลบ ลดวันละ", "This rate will end the cycle below zero. Reduce daily spending by")}{" "}
            <span className="tabular">
              {formatMoney(Math.abs(f.projectedBalance) / Math.max(f.daysLeft, 1), currency)}
            </span>{" "}
            {t("ถึงจะพอดี", "to break even")}
          </span>
        </p>
      )}

      <p className="text-text-muted mt-3 text-sm">
        {t("คิดจากอัตราการใช้จ่ายจนถึงวันนี้ ไม่ใช่คำสัญญา — รายจ่ายก้อนใหญ่ต้นรอบ อย่างค่าเช่าจะดันตัวเลขนี้ให้สูงกว่าความจริง", "This projection uses spending to date. Large expenses early in the cycle, such as rent, can make it look higher than reality.")}
      </p>
    </GlassCard>
  );
}

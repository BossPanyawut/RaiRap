"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import type { CategorySpend } from "@/lib/forecast";
import { formatMoney, type Currency } from "@/lib/money";
import { localizeDefaultName } from "@/lib/locale";

/**
 * จำลองสถานการณ์ (spec 2.3) — "ถ้าลดค่าอาหาร 20% จะเหลือเงินเท่าไหร่"
 * คิดฝั่ง client ทั้งหมด ลากแล้วเห็นผลทันที ไม่ต้องรอ server
 */
export function WhatIf({
  categories,
  income,
  expense,
  currency,
}: {
  categories: CategorySpend[];
  income: number;
  expense: number;
  currency: Currency;
}) {
  const { locale, t } = useLocale();
  const [cuts, setCuts] = useState<Record<string, number>>({});

  const saved = categories.reduce(
    (s, c) => s + c.spent * ((cuts[c.id] ?? 0) / 100),
    0,
  );
  const baseBalance = income - expense;
  const touched = Object.values(cuts).some((v) => v > 0);

  if (categories.length === 0) {
    return (
      <GlassCard className="p-5">
        <h2 className="text-xl font-semibold">{t("ลองปรับดู", "Try an adjustment")}</h2>
        <p className="text-text-muted mt-2 text-[15px]">
          {t("รอบนี้ยังไม่มีรายจ่ายให้ลอง บันทึกรายการก่อน", "There are no expenses in this cycle to adjust yet.")}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-semibold">{t("ลองปรับดู", "Try an adjustment")}</h2>
      <p className="text-text-muted mt-1 text-sm">
        {t("ลากเพื่อดูว่าถ้าลดหมวดไหนลง จะเหลือเงินเท่าไหร่ — ไม่กระทบข้อมูลจริง", "Drag to see how category cuts affect your balance. Your data will not change.")}
      </p>

      <ul className="mt-4 flex flex-col gap-4">
        {categories.map((c) => {
          const pct = cuts[c.id] ?? 0;
          const after = c.spent * (1 - pct / 100);
          return (
            <li key={c.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[15px]">
                <label htmlFor={`cut-${c.id}`}>{localizeDefaultName(locale, c.name)}</label>
                <span className="tabular text-text-muted text-sm">
                  {formatMoney(c.spent, currency)}
                  {pct > 0 && <> → {formatMoney(after, currency)}</>}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id={`cut-${c.id}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) =>
                    setCuts((v) => ({ ...v, [c.id]: Number(e.target.value) }))
                  }
                  // ตัวเลขอยู่ในชื่อ ไม่ใช่แค่ตำแหน่งของ thumb ที่มองด้วยตาอย่างเดียว
                  aria-label={`${t("ลดหมวด", "Reduce")} ${localizeDefaultName(locale, c.name)} ${pct}%`}
                  aria-valuetext={`${t("ลด", "Reduce")} ${pct}% ${t("เหลือ", "to")} ${formatMoney(after, currency)}`}
                  className="accent-accent-primary-strong flex-1"
                />
                <span className="tabular w-12 text-right text-sm">−{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-glass-border mt-5 border-t pt-4">
        <p className="text-text-muted text-[15px]">
          {t("เดิมเหลือ", "Original balance")} <span className="tabular">{formatMoney(baseBalance, currency)}</span>
        </p>
        <p className="money mt-1 text-3xl font-semibold">
          {formatMoney(baseBalance + saved, currency)}
        </p>
        <p className="text-text-muted mt-1 text-sm">
          {touched
            ? `${t("ประหยัดได้", "Saved")} ${formatMoney(saved, currency)}`
            : t("ลากแถบด้านบนเพื่อดูผล", "Drag a slider above to see the result")}
        </p>

        {touched && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCuts({})}
            className="mt-3"
          >
            {t("เริ่มใหม่", "Reset")}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

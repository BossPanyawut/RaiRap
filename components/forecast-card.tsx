import { GlassCard } from "@/components/ui/glass-card";
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
  if (f.daysGone === 0 || f.isPast) return null;

  const tight = f.projectedBalance < 0;

  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-semibold">ถ้าใช้อัตรานี้ต่อไป</h2>

      <p className="money mt-2 text-3xl font-semibold">
        {formatMoney(f.projectedBalance, currency)}
      </p>
      <p className="text-text-muted mt-1 text-sm">ยอดคงเหลือปลายรอบ</p>

      {/* แสดงวิธีคิดให้เห็น ไม่ใช่โยนตัวเลขที่เถียงไม่ได้ใส่หน้า */}
      <p className="text-text-muted mt-3 text-[15px]">
        ผ่านมา {f.daysGone} จาก {f.daysTotal} วัน ใช้เฉลี่ยวันละ{" "}
        <span className="tabular">{formatMoney(f.burnPerDay, currency)}</span>{" "}
        เหลืออีก {f.daysLeft} วัน
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
            อัตรานี้จะทำให้ปลายรอบติดลบ ลดวันละ{" "}
            <span className="tabular">
              {formatMoney(Math.abs(f.projectedBalance) / Math.max(f.daysLeft, 1), currency)}
            </span>{" "}
            ถึงจะพอดี
          </span>
        </p>
      )}

      <p className="text-text-muted mt-3 text-sm">
        คิดจากอัตราการใช้จ่ายจนถึงวันนี้ ไม่ใช่คำสัญญา — รายจ่ายก้อนใหญ่ต้นรอบ
        อย่างค่าเช่าจะดันตัวเลขนี้ให้สูงกว่าความจริง
      </p>
    </GlassCard>
  );
}

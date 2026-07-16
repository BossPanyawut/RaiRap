import { cn } from "@/lib/cn";
import {
  budgetPct,
  budgetStatus,
  formatBaht,
  type BudgetStatus,
} from "@/lib/money";

const barClass: Record<BudgetStatus, string> = {
  ok: "bar-ok",
  warn: "bar-warn",
  over: "bar-over",
};

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
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
  );
}

export function ProgressBar({
  label,
  spent,
  budget,
  className,
}: {
  label: string;
  spent: number;
  budget: number;
  className?: string;
}) {
  const pct = budgetPct(spent, budget);
  const status = budgetStatus(pct);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[15px]">{label}</span>
        <span className="tabular text-text-muted text-sm">
          {Math.round(pct)}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(pct, 100))}
        // valuenow ถูก clamp ที่ 100 ตามสัญญาของ ARIA — valuetext จึงเป็นที่เดียว
        // ที่บอกความจริงว่าเกินไปเท่าไหร่ ให้ screen reader อ่าน
        aria-valuetext={`ใช้ไป ${formatBaht(spent)} จากงบ ${formatBaht(budget)} คิดเป็น ${Math.round(pct)}%`}
        className="h-2 overflow-hidden rounded-full bg-white/50"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-400 ease-in-out",
            barClass[status],
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* spec §7 — เกินงบต้องสื่อด้วยไอคอน + ข้อความ ไม่ใช่สีอย่างเดียว
          ตาบอดสีต้องอ่านออก และ accent-warn contrast ต่ำเกินใช้เป็นตัวอักษร */}
      {status === "over" && (
        <p className="flex items-center gap-1.5 text-sm text-text-primary">
          <AlertIcon className="size-4 shrink-0" />
          <span>ใช้เกินงบ {formatBaht(spent - budget)}</span>
        </p>
      )}
    </div>
  );
}

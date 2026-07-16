const grouped = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const groupedDecimal = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** คั่นหลักพัน ไม่มีสัญลักษณ์สกุลเงิน */
export function formatAmount(amount: number, decimals = false): string {
  return (decimals ? groupedDecimal : grouped).format(amount);
}

/**
 * "฿ 12,450" — เว้นวรรคหลัง ฿ ตาม spec §5
 * ใช้ U+00A0 ไม่ใช่ space ธรรมดา ไม่งั้นบรรทัดตัดคั่นระหว่าง ฿ กับตัวเลขได้
 */
export function formatBaht(amount: number, decimals = false): string {
  return `฿ ${formatAmount(amount, decimals)}`;
}

export type BudgetStatus = "ok" | "warn" | "over";

/**
 * ปัดทศนิยม 1 ตำแหน่ง ให้ตรงกับ round(spent / budget * 100, 1) ใน v_budget_usage
 *
 * การปัดต้องเกิดก่อนเทียบขอบเขต ไม่ใช่หลัง ไม่งั้น 79.96% จะแตกเป็นสองความจริง:
 * Postgres ปัดเป็น 80.0 แล้วบอก "warn" (การ์ดโผล่บน dashboard)
 * แต่ฝั่ง client เทียบ 79.96 ตรง ๆ ได้ "ok" แล้ววาดแท่งสีเขียว ทั้งที่จอเขียน 80%
 */
export function budgetPct(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.round((spent / budget) * 1000) / 10;
}

/** ขอบเขตตาม spec §7 — ต้องตรงกับ v_budget_usage.status ฝั่ง Postgres */
export function budgetStatus(pct: number): BudgetStatus {
  if (pct > 100) return "over";
  if (pct >= 80) return "warn";
  return "ok";
}

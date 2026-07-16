/**
 * บัญชีหนึ่งใช้สกุลเดียว ไม่มีการแปลงค่า — เปลี่ยนสกุลคือเปลี่ยนสัญลักษณ์ที่แสดง
 * ยอดที่บันทึกไว้ไม่ถูกแตะ หน้าตั้งค่าบอกผู้ใช้ตรง ๆ ว่าเป็นแบบนี้
 * รายการที่จะรองรับหลายสกุลจริงต้องเก็บ currency ต่อรายการ + อัตราแลก ณ วันนั้น
 */
export const CURRENCIES = {
  THB: { symbol: "฿", decimals: 2, label: "บาท" },
  USD: { symbol: "$", decimals: 2, label: "ดอลลาร์สหรัฐ" },
  EUR: { symbol: "€", decimals: 2, label: "ยูโร" },
  GBP: { symbol: "£", decimals: 2, label: "ปอนด์สเตอร์ลิง" },
  // เยนไม่มีหน่วยย่อย — ปัดทศนิยมทิ้งทั้งหมด ไม่ใช่แค่ซ่อน
  JPY: { symbol: "¥", decimals: 0, label: "เยน" },
} as const;

export type Currency = keyof typeof CURRENCIES;

export const DEFAULT_CURRENCY: Currency = "THB";

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && v in CURRENCIES;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    formatters.set(key, f);
  }
  return f;
}

/** คั่นหลักพัน ไม่มีสัญลักษณ์สกุลเงิน */
export function formatAmount(
  amount: number,
  currency: Currency = DEFAULT_CURRENCY,
  decimals = false,
): string {
  const max = CURRENCIES[currency].decimals;
  const d = decimals ? max : 0;
  return formatter(d, d).format(amount);
}

/**
 * "฿ 12,450" — เว้นวรรคหลังสัญลักษณ์ตาม spec §5
 * ใช้ U+00A0 ไม่ใช่ space ธรรมดา ไม่งั้นบรรทัดตัดคั่นระหว่างสัญลักษณ์กับตัวเลขได้
 */
export function formatMoney(
  amount: number,
  currency: Currency = DEFAULT_CURRENCY,
  decimals = false,
): string {
  return `${CURRENCIES[currency].symbol} ${formatAmount(amount, currency, decimals)}`;
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

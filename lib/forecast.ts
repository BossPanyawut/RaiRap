import { periodRange, todayISO } from "@/lib/dates";

export type Forecast = {
  /** สัดส่วนของรอบที่ผ่านไปแล้ว 0–1 */
  progress: number;
  daysGone: number;
  daysLeft: number;
  daysTotal: number;
  /** ใช้เฉลี่ยต่อวันจนถึงตอนนี้ */
  burnPerDay: number;
  /** รายจ่ายทั้งรอบถ้ายังใช้อัตราเดิม */
  projectedExpense: number;
  /** ยอดคงเหลือปลายรอบถ้ายังใช้อัตราเดิม */
  projectedBalance: number;
  /** รอบจบไปแล้ว → ตัวเลขเป็นของจริง ไม่ใช่คำทำนาย */
  isPast: boolean;
};

const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

/**
 * พยากรณ์แบบเส้นตรงจากอัตราการใช้จ่ายจนถึงตอนนี้ (spec 2.3)
 *
 * ตั้งใจให้เข้าใจง่ายกว่าแม่นยำ: ผู้ใช้ต้องอธิบายตัวเลขให้ตัวเองฟังได้ว่า
 * "ใช้ไปวันละ X มาแล้ว Y วัน เหลืออีก Z วัน" ไม่ใช่ผลลัพธ์จากโมเดลที่เถียงไม่ได้
 * จุดอ่อนที่รู้ตัว: รายจ่ายก้อนใหญ่ต้นรอบ (ค่าเช่า) จะดันค่าพยากรณ์ให้สูงเกินจริง
 * UI จึงบอกเสมอว่าคิดจากอัตราปัจจุบัน ไม่ใช่คำสัญญา
 */
export function forecast(
  period: string,
  cycleStartDay: number,
  income: number,
  expense: number,
): Forecast {
  const { from, to } = periodRange(period, cycleStartDay);
  const today = todayISO();

  const start = dayNum(from);
  const end = dayNum(to);
  const now = dayNum(today);
  const daysTotal = end - start + 1;

  const isPast = now > end;
  const daysGone = Math.min(Math.max(now - start + 1, 0), daysTotal);
  const daysLeft = Math.max(daysTotal - daysGone, 0);

  // ยังไม่ถึงรอบ → ไม่มีอะไรให้พยากรณ์
  if (daysGone === 0) {
    return {
      progress: 0, daysGone: 0, daysLeft: daysTotal, daysTotal,
      burnPerDay: 0, projectedExpense: 0, projectedBalance: income,
      isPast: false,
    };
  }

  const burnPerDay = expense / daysGone;
  const projectedExpense = isPast ? expense : burnPerDay * daysTotal;

  return {
    progress: daysGone / daysTotal,
    daysGone,
    daysLeft,
    daysTotal,
    burnPerDay,
    projectedExpense,
    projectedBalance: income - projectedExpense,
    isPast,
  };
}

export type CategorySpend = { id: string; name: string; spent: number };

/**
 * ต้องลดหมวดไหนเท่าไหร่ถึงจะถึงเป้า (spec 2.3)
 *
 * ตัดหมวดเป็นสัดส่วนตามยอดที่ใช้จริง — หมวดที่ใช้เยอะรับภาระมากกว่า
 * ถ้าเฉลี่ยเท่ากันทุกหมวด หมวดที่ใช้ 200 บาทจะโดนสั่งให้ลด 500 ซึ่งเป็นไปไม่ได้
 */
export function suggestCuts(
  categories: CategorySpend[],
  needToSave: number,
): { id: string; name: string; spent: number; cut: number; pct: number }[] {
  const total = categories.reduce((s, c) => s + c.spent, 0);
  if (total <= 0 || needToSave <= 0) return [];

  return categories
    .filter((c) => c.spent > 0)
    .map((c) => {
      const share = c.spent / total;
      const cut = Math.min(needToSave * share, c.spent);
      return { ...c, cut, pct: (cut / c.spent) * 100 };
    })
    .filter((c) => c.cut >= 1)
    .sort((a, b) => b.cut - a.cut);
}

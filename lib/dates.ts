import type { Month } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { th } from "date-fns/locale";

/** "07" → Month (0–11) ที่ date-fns ยอมรับ */
function monthIndex(period: string): Month {
  return (Number(period.split("-")[1]) - 1) as Month;
}

/**
 * ตรึงทุกอย่างไว้ที่เวลาไทย
 * `new Date()` ฝั่ง client ใช้ timezone ของเครื่องผู้ใช้ ซึ่งอาจไม่ใช่ไทย
 * แล้วขอบเขต "เดือนนี้" จะเพี้ยนไปหนึ่งวันที่ต้นเดือน/ปลายเดือน
 */
export const TZ = "Asia/Bangkok";

/** วันนี้ตามเวลาไทย — "2026-07-16" */
export function todayISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/** วันที่ 1 ของเดือนปัจจุบันตามเวลาไทย — ตรงกับ budgets.period_month */
export function currentPeriod(): string {
  return `${formatInTimeZone(new Date(), TZ, "yyyy-MM")}-01`;
}

/** เลื่อนเดือนจาก period — shiftPeriod("2026-07-01", -1) → "2026-06-01" */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** "กรกฎาคม 2569" — เดือนไทย + พ.ศ. */
export function formatMonthTH(period: string): string {
  const year = Number(period.split("-")[0]);
  const month = th.localize.month(monthIndex(period), { width: "wide" });
  return `${month} ${year + 543}`;
}

/** "16 ก.ค. 69" — สั้นสำหรับลิสต์รายการ */
export function formatDateTH(iso: string): string {
  const [y, , d] = iso.split("-").map(Number);
  const month = th.localize.month(monthIndex(iso), { width: "abbreviated" });
  return `${d} ${month} ${String((y + 543) % 100).padStart(2, "0")}`;
}

/** สัดส่วนของเดือนที่ผ่านไปแล้ว 0–1 — ใช้คำนวณ burn rate */
export function monthProgress(period: string): number {
  const today = todayISO();
  if (today < period) return 0;
  const [y, m] = period.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const next = shiftPeriod(period, 1);
  if (today >= next) return 1;
  return Number(today.slice(8, 10)) / daysInMonth;
}

import type { Month } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { enUS, th } from "date-fns/locale";
import type { Locale } from "@/lib/locale";

/**
 * ตรึงทุกอย่างไว้ที่เวลาไทย
 * `new Date()` ฝั่ง client ใช้ timezone ของเครื่องผู้ใช้ ซึ่งอาจไม่ใช่ไทย
 * แล้วขอบเขต "เดือนนี้" จะเพี้ยนไปหนึ่งวันที่ต้นเดือน/ปลายเดือน
 */
export const TZ = "Asia/Bangkok";

/** วันเริ่มรอบจำกัด 1–28 เพราะทุกเดือนมีวันที่ 28 เสมอ (ตรงกับ check ใน DB) */
export const MIN_CYCLE_DAY = 1;
export const MAX_CYCLE_DAY = 28;

export type TransactionPeriodScope = "day" | "week" | "month" | "year";

function monthIndex(period: string): Month {
  return (Number(period.split("-")[1]) - 1) as Month;
}

/** วันนี้ตามเวลาไทย — "2026-07-16" */
export function todayISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/** เลื่อนเดือนจาก period — shiftPeriod("2026-07-01", -1) → "2026-06-01" */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * รอบที่วันที่นี้ตกอยู่ — ต้องให้ผลตรงกับ period_of() ใน Postgres เป๊ะ
 * period ระบุด้วย "เดือนที่รอบเริ่ม" ไม่ใช่ช่วงวันที่
 * cycleStartDay = 25 → 25 ก.ค. ถึง 24 ส.ค. ทั้งช่วงคือ period "2026-07-01"
 */
export function periodOf(iso: string, cycleStartDay = 1): string {
  const anchor = `${iso.slice(0, 7)}-01`;
  const day = Number(iso.slice(8, 10));
  return day >= cycleStartDay ? anchor : shiftPeriod(anchor, -1);
}

/** รอบปัจจุบันตามเวลาไทย */
export function currentPeriod(cycleStartDay = 1): string {
  return periodOf(todayISO(), cycleStartDay);
}

/** ช่วงวันที่จริงของรอบ — ใช้ query transactions */
export function periodRange(
  period: string,
  cycleStartDay = 1,
): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${period.slice(0, 7)}-${pad(cycleStartDay)}`;
  const next = shiftPeriod(period, 1);

  if (cycleStartDay === 1) {
    // รอบปกติ = ทั้งเดือน ปลายรอบคือวันสุดท้ายของเดือนนั้น
    const [y, m] = period.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from, to: `${period.slice(0, 7)}-${pad(lastDay)}` };
  }

  // รอบคร่อมเดือน ปลายรอบคือวันก่อนวันเริ่มรอบของเดือนถัดไป
  const [ny, nm] = next.split("-").map(Number);
  const end = new Date(Date.UTC(ny, nm - 1, cycleStartDay - 1));
  return {
    from,
    to: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
  };
}

/** "กรกฎาคม 2569" หรือ "25 ก.ค. – 24 ส.ค. 2569" ถ้ารอบไม่ตรงเดือนปฏิทิน */
export function formatPeriodTH(period: string, cycleStartDay = 1, locale: Locale = "th"): string {
  const year = Number(period.split("-")[0]);
  const dateLocale = locale === "en" ? enUS : th;
  if (cycleStartDay === 1) {
    const month = dateLocale.localize.month(monthIndex(period), { width: "wide" });
    return `${month} ${locale === "th" ? year + 543 : year}`;
  }
  const { from, to } = periodRange(period, cycleStartDay);
  const displayYear = locale === "th" ? Number(to.slice(0, 4)) + 543 : Number(to.slice(0, 4));
  return `${formatDateTH(from, false, locale)} – ${formatDateTH(to, false, locale)} ${displayYear}`;
}

/** ป้ายสั้นบนแกนกราฟ — "ก.ค." */
export function formatPeriodShortTH(period: string, locale: Locale = "th"): string {
  const dateLocale = locale === "en" ? enUS : th;
  return dateLocale.localize.month(monthIndex(period), { width: "abbreviated" });
}

/** "16 ก.ค. 69" — สั้นสำหรับลิสต์รายการ */
export function formatDateTH(iso: string, withYear = true, locale: Locale = "th"): string {
  const [y, , d] = iso.split("-").map(Number);
  const dateLocale = locale === "en" ? enUS : th;
  const month = dateLocale.localize.month(monthIndex(iso), { width: "abbreviated" });
  const base = `${d} ${month}`;
  const shortYear = locale === "th" ? (y + 543) % 100 : y;
  return withYear ? `${base} ${locale === "th" ? String(shortYear).padStart(2, "0") : shortYear}` : base;
}

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateISO(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const date = utcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return dateISO(date);
}

/** ช่วงเวลาปฏิทิน ใช้วันจันทร์เป็นวันแรกของสัปดาห์ตามการใช้งานในไทย */
export function transactionPeriodRange(
  anchor: string,
  scope: TransactionPeriodScope,
): { from: string; to: string } {
  const [year, month] = anchor.split("-").map(Number);

  if (scope === "day") return { from: anchor, to: anchor };

  if (scope === "week") {
    const day = utcDate(anchor).getUTCDay();
    const mondayOffset = (day + 6) % 7;
    const from = addDays(anchor, -mondayOffset);
    return { from, to: addDays(from, 6) };
  }

  if (scope === "month") {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      from: `${anchor.slice(0, 7)}-01`,
      to: `${anchor.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** เลื่อน anchor โดยคงเลขวันไว้เท่าที่เดือน/ปีปลายทางมีจริง */
export function shiftTransactionAnchor(
  anchor: string,
  scope: TransactionPeriodScope,
  amount: number,
): string {
  if (scope === "day") return addDays(anchor, amount);
  if (scope === "week") return addDays(anchor, amount * 7);

  const [year, month, day] = anchor.split("-").map(Number);
  const targetMonth = scope === "month" ? month - 1 + amount : month - 1;
  const targetYear = scope === "year" ? year + amount : year;
  const first = new Date(Date.UTC(targetYear, targetMonth, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return dateISO(first);
}

export function formatTransactionPeriodTH(
  anchor: string,
  scope: TransactionPeriodScope,
  locale: Locale = "th",
): string {
  if (scope === "day") return formatDateTH(anchor, true, locale);
  if (scope === "week") {
    const { from, to } = transactionPeriodRange(anchor, scope);
    return `${formatDateTH(from, true, locale)} – ${formatDateTH(to, true, locale)}`;
  }
  if (scope === "month") return formatPeriodTH(`${anchor.slice(0, 7)}-01`, 1, locale);
  return locale === "th" ? `ปี ${Number(anchor.slice(0, 4)) + 543}` : `Year ${Number(anchor.slice(0, 4))}`;
}

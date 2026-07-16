import type { Month } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { th } from "date-fns/locale";

/**
 * ตรึงทุกอย่างไว้ที่เวลาไทย
 * `new Date()` ฝั่ง client ใช้ timezone ของเครื่องผู้ใช้ ซึ่งอาจไม่ใช่ไทย
 * แล้วขอบเขต "เดือนนี้" จะเพี้ยนไปหนึ่งวันที่ต้นเดือน/ปลายเดือน
 */
export const TZ = "Asia/Bangkok";

/** วันเริ่มรอบจำกัด 1–28 เพราะทุกเดือนมีวันที่ 28 เสมอ (ตรงกับ check ใน DB) */
export const MIN_CYCLE_DAY = 1;
export const MAX_CYCLE_DAY = 28;

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
export function formatPeriodTH(period: string, cycleStartDay = 1): string {
  const year = Number(period.split("-")[0]);
  if (cycleStartDay === 1) {
    const month = th.localize.month(monthIndex(period), { width: "wide" });
    return `${month} ${year + 543}`;
  }
  const { from, to } = periodRange(period, cycleStartDay);
  return `${formatDateTH(from, false)} – ${formatDateTH(to, false)} ${Number(to.slice(0, 4)) + 543}`;
}

/** ป้ายสั้นบนแกนกราฟ — "ก.ค." */
export function formatPeriodShortTH(period: string): string {
  return th.localize.month(monthIndex(period), { width: "abbreviated" });
}

/** "16 ก.ค. 69" — สั้นสำหรับลิสต์รายการ */
export function formatDateTH(iso: string, withYear = true): string {
  const [y, , d] = iso.split("-").map(Number);
  const month = th.localize.month(monthIndex(iso), { width: "abbreviated" });
  const base = `${d} ${month}`;
  return withYear ? `${base} ${String((y + 543) % 100).padStart(2, "0")}` : base;
}

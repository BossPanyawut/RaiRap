/**
 * จานสีกราฟ — spec §7 ห้ามใช้หลายสีในกราฟเดียว ให้เล่นเข้ม-อ่อนของฟ้า
 *
 * ทุกค่าเป็น CSS var ไม่ใช่ hex ตรง ๆ เพื่อให้ dark mode สลับได้ที่ชั้น CSS
 * โดยไม่ต้องส่ง theme ผ่าน props ลงมาทุกคอมโพเนนต์ (ค่าจริงอยู่ใน globals.css)
 * SVG ยอมรับ var() ใน fill/stroke ได้ Recharts จึงใช้ตรง ๆ ได้เลย
 *
 * เป็น ordinal ramp ไม่ใช่ categorical: slice เรียงตามยอดจ่าย สลับลำดับแล้ว
 * ความหมายเปลี่ยน สีจึงต้องสื่อลำดับ = สีเดียวไล่เฉด
 * ค่าไล่ใน OKLCH ไม่ใช่ hex lerp (lerp ผ่านโซนน้ำเงินจะออกม่วงหม่นกลางทาง)
 *
 * วัดจริงบนพื้นการ์ด:
 *   light (#EDF6FC) 8.9 · 6.2 · 4.2 · 3.1 · 2.4 · 1.9
 *   dark  (#16304A) 9.5 · 7.1 · 5.1 · 3.7 · 2.8 · 2.1
 *
 * ขั้นท้าย ๆ ต่ำกว่า 3:1 ทั้งสองโหมด และรัดยังไงก็ไม่ผ่าน — พื้นกระจกไม่เหลือที่
 * ให้ไล่ 6 ขั้นที่ทั้งแยกออกจากกันและคอนทราสต์พอ จึงชดเชยตามที่สกิล dataviz กำหนด:
 *   1. เว้นช่อง 2px สีพื้นระหว่าง slice → ทุกชิ้นมีขอบ ไม่ต้องพึ่ง fill contrast
 *   2. label ตรง + ตารางจัดอันดับข้าง ๆ → ตัวตนมาจากข้อความ ไม่ใช่สี
 * ห้ามตัดข้อใดข้อหนึ่งทิ้ง ไม่งั้น slice ปลาย ramp จะหายไปกับพื้น
 *
 * dark ไม่ใช่การกลับสีของ light — ramp กลับทิศเป็นอ่อน→เข้ม เพราะบนพื้นมืด
 * "มากกว่า = สว่างกว่า" และชุดของ light บนพื้นมืดจม 3 ขั้น (1.57/2.14/2.89)
 */
export const RAMP = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
] as const;

/** จำนวน slice สูงสุด — เกินนี้ค่าใกล้กันจนอ่านไม่ออก ที่เหลือยุบเป็น "อื่น ๆ" */
export const MAX_SLICES = RAMP.length;

/** spec §7 — เส้นกราฟใช้ accent-primary + gradient fill จางลงล่าง */
export const LINE = "var(--color-chart-line)";

/** รายรับ mint / รายจ่าย ฟ้า — ห้ามแดง (spec §3) รายจ่ายไม่ใช่เรื่องแย่ */
export const INCOME = "var(--color-chart-income)";
export const EXPENSE = "var(--color-chart-expense)";

/** สีพื้นการ์ด ใช้เป็นช่องว่างระหว่าง slice */
export const SURFACE = "var(--color-chart-surface)";

export const AXIS = "var(--color-chart-axis)";
export const GRID = "var(--color-chart-grid)";

/** พื้น tooltip — ต้องทึบพอให้อ่านออกทั้งสองโหมด */
export const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: "1px solid var(--color-glass-border)",
  background: "var(--color-tooltip-bg)",
  color: "var(--color-text-primary)",
  fontSize: 14,
} as const;

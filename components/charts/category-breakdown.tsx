"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { MAX_SLICES, RAMP, SURFACE, TOOLTIP_STYLE } from "@/lib/chart-palette";
import { formatMoney, type Currency } from "@/lib/money";

export type Slice = { name: string; value: number };

/** top (MAX_SLICES-1) + ยุบที่เหลือเป็น "อื่น ๆ" — เกิน 6 ชิ้นค่าใกล้กันจนอ่านไม่ออก */
function foldTail(rows: Slice[]): Slice[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_SLICES) return sorted;
  const head = sorted.slice(0, MAX_SLICES - 1);
  const tail = sorted.slice(MAX_SLICES - 1);
  return [
    ...head,
    { name: "อื่น ๆ", value: tail.reduce((s, r) => s + r.value, 0) },
  ];
}

export function CategoryBreakdown({
  rows,
  currency,
}: {
  rows: Slice[];
  currency: Currency;
}) {
  const data = foldTail(rows.filter((r) => r.value > 0));
  const total = data.reduce((s, r) => s + r.value, 0);

  if (total === 0) {
    return (
      <p className="text-text-muted py-8 text-center text-[15px]">
        เดือนนี้ยังไม่มีรายจ่าย
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="h-56 w-56 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="100%"
              // ช่องว่างสีพื้น 2px — ทำให้ทุก slice มีขอบของตัวเอง ขั้นสีอ่อน
              // จึงยังแยกออกแม้ contrast ต่ำกว่า 3:1
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={RAMP[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatMoney(Number(v), currency)}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ตัวตนของแต่ละหมวดมาจากตารางนี้ ไม่ใช่จากสี — สกิล dataviz บังคับไว้
          เมื่อ contrast ของขั้นสีอ่อนต่ำกว่า 3:1 และเป็น table view ในตัว */}
      <table className="w-full text-[15px]">
        <caption className="sr-only">รายจ่ายแยกตามหมวด เรียงจากมากไปน้อย</caption>
        <thead className="sr-only">
          <tr>
            <th>หมวด</th>
            <th>จำนวนเงิน</th>
            <th>สัดส่วน</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.name} className="border-glass-border border-b last:border-0">
              <td className="py-2">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: RAMP[i] }}
                  />
                  <span className="truncate">{r.name}</span>
                </span>
              </td>
              {/* แสดงสตางค์เต็ม เหมือนหน้ารายการ — ตารางนี้เป็นตัวแจกแจง
                  ถ้าปัดทีละแถว ผู้ใช้บวกเองแล้วไม่ตรงกับยอดรวมจริง */}
              <td className="tabular py-2 text-right font-mono">
                {formatMoney(r.value, currency, true)}
              </td>
              <td className="tabular text-text-muted py-2 pl-3 text-right text-sm">
                {Math.round((r.value / total) * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

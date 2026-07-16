"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS, EXPENSE, GRID, INCOME, TOOLTIP_STYLE } from "@/lib/chart-palette";
import { formatPeriodShortTH, formatPeriodTH } from "@/lib/dates";
import { formatAmount, formatMoney, type Currency } from "@/lib/money";

export type MonthPoint = { period: string; income: number; expense: number };

export function IncomeExpenseBar({
  rows,
  currency,
  cycleStartDay,
}: {
  rows: MonthPoint[];
  currency: Currency;
  cycleStartDay: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-text-muted py-8 text-center text-[15px]">
        ยังไม่มีข้อมูลให้เปรียบเทียบ
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={(p: string) => formatPeriodShortTH(p)}
            tick={{ fill: AXIS, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatAmount(v, currency)}
            tick={{ fill: AXIS, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            labelFormatter={(p) => formatPeriodTH(String(p), cycleStartDay)}
            formatter={(v) => formatMoney(Number(v), currency)}
            contentStyle={TOOLTIP_STYLE}
          />
          {/* สองชุดข้อมูล → ต้องมี legend เสมอ ตัวตนห้ามมาจากสีอย่างเดียว */}
          <Legend
            formatter={(v) => (
              <span style={{ color: AXIS, fontSize: 14 }}>{v}</span>
            )}
          />
          <Bar
            dataKey="income"
            name="รายรับ"
            fill={INCOME}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expense"
            name="รายจ่าย"
            fill={EXPENSE}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

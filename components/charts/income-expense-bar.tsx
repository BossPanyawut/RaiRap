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
import { AXIS, EXPENSE, GRID, INCOME } from "@/lib/chart-palette";
import { formatMonthTH } from "@/lib/dates";
import { formatAmount, formatBaht } from "@/lib/money";

export type MonthPoint = { period: string; income: number; expense: number };

export function IncomeExpenseBar({ rows }: { rows: MonthPoint[] }) {
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
            tickFormatter={(p: string) => formatMonthTH(p).split(" ")[0].slice(0, 3)}
            tick={{ fill: AXIS, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatAmount(v)}
            tick={{ fill: AXIS, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            labelFormatter={(p) => formatMonthTH(String(p))}
            formatter={(v) => formatBaht(Number(v))}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.8)",
              background: "rgba(255,255,255,0.92)",
              fontSize: 14,
            }}
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

"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS, GRID, LINE, TOOLTIP_STYLE } from "@/lib/chart-palette";
import { formatPeriodShortTH, formatPeriodTH } from "@/lib/dates";
import { formatAmount, formatMoney, type Currency } from "@/lib/money";

export type TrendPoint = { period: string; balance: number };

export function BalanceTrend({
  rows,
  currency,
  cycleStartDay,
}: {
  rows: TrendPoint[];
  currency: Currency;
  cycleStartDay: number;
}) {
  if (rows.length < 2) {
    return (
      <p className="text-text-muted py-8 text-center text-[15px]">
        ต้องมีข้อมูลอย่างน้อย 2 เดือนถึงจะเห็นแนวโน้ม
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {/* spec §7 — gradient fill จางลงข้างล่าง */}
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity={0.28} />
              <stop offset="100%" stopColor={LINE} stopOpacity={0.02} />
            </linearGradient>
          </defs>

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
            formatter={(v) => [formatMoney(Number(v), currency), "ยอดคงเหลือสะสม"]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={LINE}
            strokeWidth={2}
            fill="url(#balanceFill)"
            dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

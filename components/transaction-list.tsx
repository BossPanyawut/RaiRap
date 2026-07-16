"use client";

import { useState } from "react";
import {
  deleteTransaction,
} from "@/app/(app)/transactions/actions";
import {
  TransactionForm,
  type CategoryOption,
  type EditingTransaction,
} from "@/components/transaction-form";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatDateTH } from "@/lib/dates";
import { formatBaht } from "@/lib/money";

export type TransactionRow = EditingTransaction & {
  kind: "income" | "expense";
  categories: { name: string } | null;
};

export function TransactionList({
  rows,
  categories,
  today,
}: {
  rows: TransactionRow[];
  categories: CategoryOption[];
  today: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <GlassCard className="p-0">
        <EmptyState title="ยังไม่มีรายการที่ตรงกับที่ค้นหา" />
      </GlassCard>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((t) => (
        <li key={t.id}>
          <GlassCard className="p-4">
            {editingId === t.id ? (
              <TransactionForm
                categories={categories}
                today={today}
                editing={t}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">
                    {t.categories?.name ?? "หมวดที่ถูกลบ"}
                  </p>
                  <p className="text-text-muted truncate text-sm">
                    {formatDateTH(t.occurred_on)}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>

                <p
                  className="font-mono shrink-0 tabular text-[15px]"
                  // รายรับ/รายจ่ายต่างกันที่เครื่องหมาย ไม่ใช่แค่สี — ตาบอดสีต้องอ่านออก
                >
                  {t.kind === "income" ? "+" : "−"}
                  {formatBaht(t.amount, true)}
                </p>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(t.id)}
                    className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
                  >
                    แก้ไข
                  </button>
                  <form action={deleteTransaction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
                    >
                      ลบ
                    </button>
                  </form>
                </div>
              </div>
            )}
          </GlassCard>
        </li>
      ))}
    </ul>
  );
}

export function AddTransactionCard({
  categories,
  today,
}: {
  categories: CategoryOption[];
  today: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="self-start">
        เพิ่มรายการ
      </Button>
    );
  }

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">เพิ่มรายการ</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
        >
          ปิด
        </button>
      </div>
      <TransactionForm categories={categories} today={today} />
    </GlassCard>
  );
}

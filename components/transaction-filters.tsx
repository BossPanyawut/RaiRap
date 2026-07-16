"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { CategoryOption } from "@/components/transaction-form";

export function TransactionFilters({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const active = ["from", "to", "category", "min", "max", "q"].filter((k) =>
    params.get(k),
  ).length;

  function apply(formData: FormData) {
    const next = new URLSearchParams();
    for (const [k, v] of formData.entries()) {
      const s = String(v).trim();
      if (s) next.set(k, s);
    }
    router.push(next.toString() ? `/transactions?${next}` : "/transactions");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-text-muted self-start rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
      >
        ค้นหาและกรอง{active > 0 ? ` (${active})` : ""}
      </button>
    );
  }

  return (
    <GlassCard className="p-5">
      <form action={apply} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            ตั้งแต่วันที่
            <input
              type="date"
              name="from"
              defaultValue={params.get("from") ?? ""}
              className="border-glass-border rounded-2xl border bg-white/60 px-4 py-2.5 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            ถึงวันที่
            <input
              type="date"
              name="to"
              defaultValue={params.get("to") ?? ""}
              className="border-glass-border rounded-2xl border bg-white/60 px-4 py-2.5 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            หมวดหมู่
            <select
              name="category"
              defaultValue={params.get("category") ?? ""}
              className="border-glass-border rounded-2xl border bg-white/60 px-4 py-2.5 font-normal"
            >
              <option value="">ทุกหมวด</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind === "income" ? "รายรับ" : "รายจ่าย"})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            คำในบันทึกย่อ
            <input
              name="q"
              defaultValue={params.get("q") ?? ""}
              className="border-glass-border rounded-2xl border bg-white/60 px-4 py-2.5 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            เงินตั้งแต่
            <input
              type="number"
              name="min"
              min="0"
              step="0.01"
              defaultValue={params.get("min") ?? ""}
              className="border-glass-border tabular rounded-2xl border bg-white/60 px-4 py-2.5 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            เงินถึง
            <input
              type="number"
              name="max"
              min="0"
              step="0.01"
              defaultValue={params.get("max") ?? ""}
              className="border-glass-border tabular rounded-2xl border bg-white/60 px-4 py-2.5 font-normal"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <Button type="submit">ค้นหา</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/transactions")}
          >
            ล้างตัวกรอง
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            ปิด
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}

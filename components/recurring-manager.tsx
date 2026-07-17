"use client";

import { useActionState, useState } from "react";
import {
  createRule,
  deleteRule,
  runNow,
  togglePause,
  FREQ_LABELS,
  type RecurringState,
} from "@/app/(app)/recurring/actions";
import type { CategoryOption } from "@/components/transaction-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDateTH } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";

export type Rule = {
  id: string;
  amount: number;
  kind: "income" | "expense";
  note: string | null;
  freq: keyof typeof FREQ_LABELS;
  every: number;
  starts_on: string;
  ends_on: string | null;
  is_paused: boolean;
  categories: { name: string } | null;
  accounts: { name: string } | null;
};

export type AccountOption = { id: string; name: string };

const inputClass = "border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-[15px]";

function describe(r: Rule): string {
  const unit = FREQ_LABELS[r.freq];
  return r.every === 1 ? `ทุก${unit}` : `ทุก ${r.every} ${unit}`;
}

export function RecurringManager({
  rules,
  categories,
  accounts,
  today,
  currency,
}: {
  rules: Rule[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  today: string;
  currency: Currency;
}) {
  const [state, action, pending] = useActionState<RecurringState, FormData>(createRule, null);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [runState, setRunState] = useState<RecurringState>(null);
  const [running, setRunning] = useState(false);

  const options = categories.filter((c) => c.kind === kind);

  return (
    <>
      <GlassCard className="p-5">
        <h2 className="text-xl font-semibold">เพิ่มรายการเกิดซ้ำ</h2>
        <p className="text-text-muted mt-1 text-sm">
          ระบบสร้างรายการให้อัตโนมัติเมื่อถึงกำหนด ตอนที่คุณเปิดแอป
        </p>

        <form action={action} className="mt-4 flex flex-col gap-4">
          <fieldset className="flex gap-2">
            <legend className="sr-only">ประเภทรายการ</legend>
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-[15px] transition-colors duration-400 ease-in-out",
                  kind === k
                    ? "bg-accent-primary-strong text-white"
                    : "border-glass-border text-text-muted border bg-input hover:bg-hover",
                )}
              >
                {k === "expense" ? "รายจ่าย" : "รายรับ"}
              </button>
            ))}
          </fieldset>

          <Field id="amount" name="amount" label="จำนวนเงิน" type="number" inputMode="decimal" step="0.01" min="0.01" className="money text-2xl" required />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoryId" className="text-[15px] font-medium">หมวดหมู่</label>
            <select id="categoryId" name="categoryId" required className={inputClass}>
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {accounts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="accountId" className="text-[15px] font-medium">บัญชี</label>
              <select id="accountId" name="accountId" defaultValue="" className={inputClass}>
                <option value="">ไม่ระบุ</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1.5 text-[15px] font-medium">
              ทุก ๆ
              <input name="every" type="number" min={1} max={99} defaultValue={1} required className={cn(inputClass, "w-20 font-normal")} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-[15px] font-medium">
              หน่วย
              <select name="freq" defaultValue="monthly" className={cn(inputClass, "font-normal")}>
                {Object.entries(FREQ_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <Field id="startsOn" name="startsOn" label="เริ่มวันที่" type="date" defaultValue={today} required hint="ถ้าย้อนหลัง ระบบจะสร้างงวดที่ผ่านมาให้ด้วย" />
          <Field id="endsOn" name="endsOn" label="ถึงวันที่" type="date" hint="ไม่ใส่ = ไม่มีวันจบ" />
          <Field id="note" name="note" label="บันทึกย่อ" placeholder="ไม่ใส่ก็ได้" maxLength={200} />

          {state && "error" in state && <Alert>{state.error}</Alert>}
          {state && "ok" in state && (
            <p role="status" className="text-text-muted text-sm">{state.ok}</p>
          )}

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "กำลังบันทึก" : "บันทึก"}
          </Button>
        </form>
      </GlassCard>

      {rules.length === 0 ? (
        <GlassCard className="p-0">
          <EmptyState title="ยังไม่มีรายการเกิดซ้ำ เหมาะกับค่าเช่า ค่าสมาชิก หรือเงินเดือน" />
        </GlassCard>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold">กฎที่ตั้งไว้</h2>
            <Button
              type="button"
              variant="secondary"
              disabled={running}
              className="px-4 py-2 text-sm"
              onClick={async () => {
                setRunning(true);
                setRunState(await runNow());
                setRunning(false);
              }}
            >
              {running ? "กำลังตรวจ" : "ตรวจงวดที่ค้าง"}
            </Button>
          </div>
          {runState && "ok" in runState && (
            <p role="status" className="text-text-muted px-1 text-sm">{runState.ok}</p>
          )}
          {runState && "error" in runState && <Alert>{runState.error}</Alert>}

          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.id}>
                <GlassCard className={cn("flex items-center gap-3 p-4", r.is_paused && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">
                      {r.categories?.name ?? "หมวดที่ถูกลบ"}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                    <p className="text-text-muted truncate text-sm">
                      {describe(r)} · เริ่ม {formatDateTH(r.starts_on)}
                      {r.ends_on && ` ถึง ${formatDateTH(r.ends_on)}`}
                      {r.accounts && ` · ${r.accounts.name}`}
                      {r.is_paused && " · หยุดอยู่"}
                    </p>
                  </div>

                  <p className="tabular shrink-0 font-mono text-[15px]">
                    {r.kind === "income" ? "+" : "−"}
                    {formatMoney(Number(r.amount), currency, true)}
                  </p>

                  <div className="flex shrink-0 gap-1">
                    <form action={togglePause}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="paused" value={String(r.is_paused)} />
                      <button type="submit" className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover">
                        {r.is_paused ? "เริ่มต่อ" : "หยุด"}
                      </button>
                    </form>
                    <form action={deleteRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover">
                        ลบ
                      </button>
                    </form>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
          <p className="text-text-muted px-1 text-sm">
            ลบกฎไม่ลบรายการที่สร้างไปแล้ว รายการในอดีตยังเป็นประวัติที่เกิดขึ้นจริง
          </p>
        </>
      )}
    </>
  );
}

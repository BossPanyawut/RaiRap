"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createTransaction,
  updateTransaction,
  type FormState,
} from "@/app/(app)/transactions/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

export type EditingTransaction = {
  id: string;
  category_id: string;
  amount: number;
  occurred_on: string;
  note: string | null;
};

export function TransactionForm({
  categories,
  today,
  editing,
  onDone,
}: {
  categories: CategoryOption[];
  today: string;
  editing?: EditingTransaction;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    editing ? updateTransaction : createTransaction,
    null,
  );
  const [kind, setKind] = useState<"income" | "expense">(
    editing
      ? (categories.find((c) => c.id === editing.category_id)?.kind ?? "expense")
      : "expense",
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state) {
      if (editing) onDone?.();
      else formRef.current?.reset();
    }
  }, [state, editing, onDone]);

  const options = categories.filter((c) => c.kind === kind);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

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
                : "border-glass-border text-text-muted border bg-white/50 hover:bg-white/70",
            )}
          >
            {k === "expense" ? "รายจ่าย" : "รายรับ"}
          </button>
        ))}
      </fieldset>

      <Field
        id="amount"
        name="amount"
        label="จำนวนเงิน"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0.01"
        defaultValue={editing?.amount}
        className="money text-2xl"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoryId" className="text-[15px] font-medium">
          หมวดหมู่
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={editing?.category_id}
          required
          className="border-glass-border rounded-2xl border bg-white/60 px-4 py-2.5 text-[15px]"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="occurredOn"
        name="occurredOn"
        label="วันที่"
        type="date"
        defaultValue={editing?.occurred_on ?? today}
        required
      />

      <Field
        id="note"
        name="note"
        label="บันทึกย่อ"
        defaultValue={editing?.note ?? ""}
        placeholder="ไม่ใส่ก็ได้"
        maxLength={200}
      />

      {state && "error" in state && <Alert>{state.error}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "กำลังบันทึก" : "บันทึก"}
        </Button>
        {editing && (
          <Button type="button" variant="secondary" onClick={onDone}>
            ยกเลิก
          </Button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createTransaction,
  updateTransaction,
  type FormState,
} from "@/app/(app)/transactions/actions";
import { AmountCalculatorField } from "@/components/amount-calculator-field";
import { useLocale } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { localizeDefaultName } from "@/lib/locale";

export type CategoryOption = { id: string; name: string; kind: "income" | "expense" };
export type AccountOption = { id: string; name: string };

export type EditingTransaction = {
  id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  occurred_on: string;
  note: string | null;
};

export function TransactionForm({
  categories,
  accounts,
  today,
  editing,
  onDone,
}: {
  categories: CategoryOption[];
  accounts: AccountOption[];
  today: string;
  editing?: EditingTransaction;
  onDone?: () => void;
}) {
  const { locale, t } = useLocale();
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
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  const options = categories.filter((c) => c.kind === kind);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <fieldset className="flex gap-2">
        <legend className="sr-only">{t("ประเภทรายการ", "Transaction type")}</legend>
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
            {k === "expense" ? t("รายจ่าย", "Expense") : t("รายรับ", "Income")}
          </button>
        ))}
      </fieldset>

      <AmountCalculatorField id="amount" defaultValue={editing?.amount} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoryId" className="text-[15px] font-medium">
          {t("หมวดหมู่", "Category")}
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={editing?.category_id}
          required
          className="border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-base sm:text-[15px]"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {localizeDefaultName(locale, c.name)}
            </option>
          ))}
        </select>
      </div>

      {accounts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accountId" className="text-[15px] font-medium">
            {t("บัญชี", "Account")}
          </label>
          <select
            id="accountId"
            name="accountId"
            defaultValue={editing?.account_id ?? ""}
            className="border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-base sm:text-[15px]"
          >
            <option value="">{t("ไม่ระบุ", "Not specified")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Field
        id="occurredOn"
        name="occurredOn"
        label={t("วันที่", "Date")}
        type="date"
        defaultValue={editing?.occurred_on ?? today}
        required
      />

      <Field
        id="note"
        name="note"
        label={t("บันทึกย่อ", "Note")}
        defaultValue={editing?.note ?? ""}
        placeholder={t("ไม่ใส่ก็ได้", "Optional")}
        maxLength={200}
      />

      {state && "error" in state && <Alert>{state.error}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? t("กำลังบันทึก", "Saving") : t("บันทึก", "Save")}
        </Button>
        {editing && (
          <Button type="button" variant="secondary" onClick={onDone}>
            {t("ยกเลิก", "Cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

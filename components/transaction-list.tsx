"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteTransaction } from "@/app/(app)/transactions/actions";
import {
  TransactionForm,
  type AccountOption,
  type CategoryOption,
  type EditingTransaction,
} from "@/components/transaction-form";
import { ReceiptButton } from "@/components/receipt-button";
import { useLocale } from "@/components/locale-provider";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDateTH } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import { localizeDefaultName } from "@/lib/locale";

export type TransactionRow = EditingTransaction & {
  kind: "income" | "expense";
  receipt_path: string | null;
  categories: { name: string } | null;
  accounts: { name: string } | null;
};

export function TransactionList({
  rows,
  categories,
  accounts,
  today,
  currency,
}: {
  rows: TransactionRow[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  today: string;
  currency: Currency;
}) {
  const { locale, t: translate } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <GlassCard className="p-0">
        <EmptyState title={translate("ยังไม่มีรายการที่ตรงกับที่ค้นหา", "No transactions match your filters")} />
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
                accounts={accounts}
                today={today}
                editing={t}
                onDone={() => setEditingId(null)}
              />
            ) : (
              // สี่ก้อน (ข้อมูล/ยอด/ใบเสร็จ/ปุ่ม) ยัดแถวเดียวไม่ลง 360px
              // ให้ปุ่มตกบรรทัดสองบนจอแคบ แล้วกลับมาแถวเดียวตั้งแต่ sm ขึ้นไป
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">
                  {t.categories?.name ? localizeDefaultName(locale, t.categories.name) : translate("หมวดที่ถูกลบ", "Deleted category")}
                  </p>
                  <p className="text-text-muted truncate text-sm">
                    {formatDateTH(t.occurred_on, true, locale)}
                    {t.note ? ` · ${t.note}` : ""}
                    {t.accounts ? ` · ${t.accounts.name}` : ""}
                  </p>
                </div>

                <p
                  className={cn(
                    "font-mono shrink-0 tabular text-[15px] font-medium",
                    t.kind === "income" ? "text-income-text" : "text-expense-text",
                  )}
                  data-transaction-amount
                  data-kind={t.kind}
                  // รายรับ/รายจ่ายต่างกันที่เครื่องหมาย ไม่ใช่แค่สี — ตาบอดสีต้องอ่านออก
                >
                  {t.kind === "income" ? "+" : "−"}
                  {formatMoney(t.amount, currency, true)}
                </p>

                <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                  <ReceiptButton
                    transactionId={t.id}
                    receiptPath={t.receipt_path}
                  />

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
                    >
                      {translate("แก้ไข", "Edit")}
                    </button>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
                      >
                        {translate("ลบ", "Delete")}
                      </button>
                    </form>
                  </div>
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
  accounts,
  today,
}: {
  categories: CategoryOption[];
  accounts: AccountOption[];
  today: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  const closeSheet = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => fabRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      sheetRef.current
        ?.querySelector<HTMLElement>("[data-close-transaction-form]")
        ?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSheet, open]);

  if (!open) {
    return (
      <Button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        data-transaction-fab
        className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 shadow-[0_12px_32px_rgb(20_76_140/0.28)] sm:right-6 sm:bottom-6"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t("เพิ่มรายการ", "Add transaction")}
      </Button>
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        data-add-transaction-backdrop
        onMouseDown={closeSheet}
        className="bg-text-primary/25 fixed inset-0 z-40"
      />
      <section
        ref={sheetRef}
        id="add-transaction-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-transaction-title"
        data-add-transaction-sheet
        className="glass fixed right-0 bottom-0 left-0 z-50 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-b-none px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-20px_56px_rgb(20_76_140/0.20)] sm:right-auto sm:bottom-4 sm:left-1/2 sm:w-[min(42rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[24px] sm:p-6"
      >
        <div className="bg-text-muted/35 mx-auto mb-2 h-1 w-10 rounded-full sm:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-transaction-title" className="text-xl font-semibold">{t("เพิ่มรายการ", "Add transaction")}</h2>
          <button
            type="button"
            onClick={closeSheet}
            data-close-transaction-form
            className="text-text-muted min-h-11 rounded-full px-3 text-sm hover:bg-hover"
          >
            {t("ปิด", "Close")}
          </button>
        </div>
        <TransactionForm
          categories={categories}
          accounts={accounts}
          today={today}
          onDone={closeSheet}
        />
      </section>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";
import type { AccountOption, CategoryOption } from "@/components/transaction-form";
import { cn } from "@/lib/cn";
import { localizeDefaultName } from "@/lib/locale";
import {
  formatDateTH,
  formatTransactionPeriodTH,
  shiftTransactionAnchor,
  transactionPeriodRange,
  type TransactionPeriodScope,
} from "@/lib/dates";

type PeriodScope = TransactionPeriodScope | "custom";
type ViewMode = "list" | "calendar";
type Panel = "time" | "details";

const scopes: { value: TransactionPeriodScope; label: string }[] = [
  { value: "day", label: "วัน" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
];

const detailKeys = ["kind", "category", "account", "min", "max", "q"];

function isScope(value: string | null): value is PeriodScope {
  return ["day", "week", "month", "year", "custom"].includes(value ?? "");
}

export function TransactionFilters({
  categories,
  accounts,
  today,
}: {
  categories: CategoryOption[];
  accounts: AccountOption[];
  today: string;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const rawScope = params.get("scope");
  const scope: PeriodScope = isScope(rawScope) ? rawScope : "month";
  const view: ViewMode = params.get("view") === "calendar" ? "calendar" : "list";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.get("at") ?? "")
    ? params.get("at")!
    : today;
  const active = detailKeys.filter((key) => params.get(key)).length;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [rangeError, setRangeError] = useState("");
  const [detailError, setDetailError] = useState("");
  const timeTriggerRef = useRef<HTMLButtonElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  function closePanel() {
    const trigger = panel === "time" ? timeTriggerRef.current : detailTriggerRef.current;
    setPanel(null);
    requestAnimationFrame(() => trigger?.focus());
  }

  useEffect(() => {
    if (!panel) return;
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const trigger = panel === "time" ? timeTriggerRef.current : detailTriggerRef.current;
        setPanel(null);
        requestAnimationFrame(() => trigger?.focus());
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panel]);

  function navigate(next: URLSearchParams) {
    next.delete("page");
    router.push(next.toString() ? `/transactions?${next}` : "/transactions");
  }

  function chooseScope(nextScope: TransactionPeriodScope) {
    const next = new URLSearchParams(params);
    next.set("scope", nextScope);
    next.set("at", scope === "custom" ? today : anchor);
    next.delete("from");
    next.delete("to");
    navigate(next);
    closePanel();
  }

  function chooseCustom() {
    const next = new URLSearchParams(params);
    const baseScope = scope === "custom" ? "month" : scope;
    const range = transactionPeriodRange(anchor, baseScope);
    next.set("scope", "custom");
    next.set("view", "list");
    if (!next.get("from")) next.set("from", range.from);
    if (!next.get("to")) next.set("to", range.to);
    navigate(next);
  }

  function movePeriod(amount: number) {
    if (scope === "custom") return;
    const next = new URLSearchParams(params);
    next.set("scope", scope);
    next.set("at", shiftTransactionAnchor(anchor, scope, amount));
    navigate(next);
  }

  function goToCurrentPeriod() {
    if (scope === "custom") return;
    const next = new URLSearchParams(params);
    next.set("scope", scope);
    next.set("at", today);
    navigate(next);
    closePanel();
  }

  function chooseView(nextView: ViewMode) {
    const next = new URLSearchParams(params);
    next.set("view", nextView);
    if (nextView === "calendar" && scope === "custom") {
      next.set("scope", "month");
      next.set("at", today);
      next.delete("from");
      next.delete("to");
    }
    navigate(next);
  }

  function applyRange(formData: FormData) {
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");
    if (from > to) {
      setRangeError(t("วันเริ่มต้องไม่อยู่หลังวันสิ้นสุด", "Start date cannot be after end date"));
      return;
    }
    setRangeError("");
    const next = new URLSearchParams(params);
    next.set("scope", "custom");
    next.set("view", "list");
    next.set("from", from);
    next.set("to", to);
    navigate(next);
    closePanel();
  }

  function applyDetails(formData: FormData) {
    const min = String(formData.get("min") ?? "");
    const max = String(formData.get("max") ?? "");
    if (min && max && Number(min) > Number(max)) {
      setDetailError(t("จำนวนเงินเริ่มต้นต้องไม่มากกว่าจำนวนเงินสิ้นสุด", "Minimum amount cannot exceed maximum amount"));
      return;
    }
    setDetailError("");
    const next = new URLSearchParams(params);
    for (const key of detailKeys) next.delete(key);
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) next.set(key, text);
    }
    navigate(next);
    closePanel();
  }

  function clearDetails() {
    const next = new URLSearchParams(params);
    for (const key of detailKeys) next.delete(key);
    navigate(next);
    closePanel();
  }

  const from = params.get("from");
  const to = params.get("to");
  const periodLabel =
    scope === "custom"
      ? from && to
        ? `${formatDateTH(from, true, locale)} – ${formatDateTH(to, true, locale)}`
        : t("กำหนดช่วงเวลา", "Choose a date range")
      : formatTransactionPeriodTH(anchor, scope, locale);

  const scopeLabel = (value: TransactionPeriodScope) => ({
    day: t("วัน", "Day"),
    week: t("สัปดาห์", "Week"),
    month: t("เดือน", "Month"),
    year: t("ปี", "Year"),
  })[value];

  const activeLabels = [
    params.get("kind") === "income"
      ? t("รายรับ", "Income")
      : params.get("kind") === "expense"
        ? t("รายจ่าย", "Expenses")
        : null,
    (() => { const name = categories.find((category) => category.id === params.get("category"))?.name; return name ? localizeDefaultName(locale, name) : undefined; })(),
    accounts.find((account) => account.id === params.get("account"))?.name,
    params.get("q") ? `“${params.get("q")}”` : null,
    params.get("min") || params.get("max") ? t("ช่วงจำนวนเงิน", "Amount range") : null,
  ].filter((label): label is string => Boolean(label));
  const activeSummary = [
    ...activeLabels.slice(0, 2),
    activeLabels.length > 2 ? `+${activeLabels.length - 2}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative" data-transaction-filters>
      <GlassCard className="p-2.5 sm:p-3" data-transaction-toolbar>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center sm:flex-1">
            <button
              type="button"
              onClick={() => movePeriod(-1)}
              disabled={scope === "custom"}
              aria-label={t("ช่วงก่อนหน้า", "Previous period")}
              className="text-text-muted min-h-11 min-w-11 rounded-full text-xl hover:bg-hover disabled:opacity-35"
            >
              ‹
            </button>
            <button
              ref={timeTriggerRef}
              type="button"
              onClick={() => (panel === "time" ? closePanel() : setPanel("time"))}
              aria-haspopup="dialog"
              aria-expanded={panel === "time"}
              aria-controls={panel === "time" ? "transaction-time-panel" : undefined}
              data-open-time-filter
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-2 text-[15px] font-medium hover:bg-hover"
            >
              <span className="truncate" data-period-label>{periodLabel}</span>
              <span className="text-text-muted shrink-0 text-xs">
                {scope === "custom"
                  ? t("กำหนดเอง", "Custom")
                  : scopeLabel(scope)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => movePeriod(1)}
              disabled={scope === "custom"}
              aria-label={t("ช่วงถัดไป", "Next period")}
              className="text-text-muted min-h-11 min-w-11 rounded-full text-xl hover:bg-hover disabled:opacity-35"
            >
              ›
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 sm:shrink-0">
            <fieldset className="grid flex-1 grid-cols-2 gap-1 rounded-full bg-input p-1 sm:flex-none">
              <legend className="sr-only">{t("มุมมอง", "View")}</legend>
              {(["list", "calendar"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => chooseView(mode)}
                  className={cn(
                    "min-h-11 rounded-full px-3 text-sm font-medium transition-colors",
                    view === mode
                      ? "bg-accent-primary-strong text-white"
                      : "text-text-muted hover:bg-hover",
                  )}
                >
                  {mode === "list" ? t("รายการ", "List") : t("ปฏิทิน", "Calendar")}
                </button>
              ))}
            </fieldset>

            <button
              ref={detailTriggerRef}
              type="button"
              onClick={() => (panel === "details" ? closePanel() : setPanel("details"))}
              aria-haspopup="dialog"
              aria-expanded={panel === "details"}
              aria-controls={panel === "details" ? "transaction-detail-panel" : undefined}
              data-open-detail-filters
              className="border-glass-border text-link relative inline-flex min-h-11 items-center gap-1.5 rounded-full border bg-input px-3 text-sm font-medium hover:bg-hover"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {t("ตัวกรอง", "Filters")}
              {active > 0 && (
                <span className="bg-accent-primary-strong inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white">
                  {active}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeSummary && (
          <p className="border-glass-border text-text-muted mt-2 truncate border-t px-2 pt-2 text-sm" data-filter-summary>
            {activeSummary}
          </p>
        )}
      </GlassCard>

      {panel && (
        <>
          <button
            type="button"
            onClick={closePanel}
            aria-label={t("ปิดแผงตัวกรอง", "Close filter panel")}
            className="bg-text-primary/20 fixed inset-0 z-40 cursor-default sm:bg-transparent"
            data-filter-backdrop
          />
          <section
            ref={panelRef}
            id={panel === "time" ? "transaction-time-panel" : "transaction-detail-panel"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={panel === "time" ? "time-panel-title" : "detail-panel-title"}
            tabIndex={-1}
            data-filter-panel={panel}
            className="glass fixed right-2 bottom-0 left-2 z-50 max-h-[80dvh] overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:absolute sm:top-[calc(100%+0.5rem)] sm:right-0 sm:bottom-auto sm:left-auto sm:w-[30rem] sm:max-h-[70vh] sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id={panel === "time" ? "time-panel-title" : "detail-panel-title"}
                className="text-lg font-semibold"
              >
                {panel === "time" ? t("เลือกช่วงเวลา", "Choose period") : t("ตัวกรองรายการ", "Transaction filters")}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                aria-label={t("ปิด", "Close")}
                className="text-text-muted min-h-11 min-w-11 rounded-full text-xl hover:bg-hover"
              >
                ×
              </button>
            </div>

            {panel === "time" ? (
              <div className="flex flex-col gap-4">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">{t("ดูตามช่วง", "Period")}</legend>
                  <div className="grid grid-cols-4 gap-1 rounded-full bg-input p-1">
                    {scopes.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={scope === option.value}
                        onClick={() => chooseScope(option.value)}
                        className={cn(
                          "min-h-11 rounded-full px-2 text-sm font-medium transition-colors",
                          scope === option.value
                            ? "bg-accent-primary-strong text-white"
                            : "text-text-muted hover:bg-hover",
                        )}
                      >
                        {scopeLabel(option.value)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap gap-2">
                  {scope !== "custom" && (
                    <Button type="button" variant="secondary" onClick={goToCurrentPeriod}>
                      {t("ช่วงปัจจุบัน", "Current period")}
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={chooseCustom}>
                    {t("กำหนดช่วงเอง", "Custom range")}
                  </Button>
                </div>

                {scope === "custom" && (
                  <form action={applyRange} className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      {t("ตั้งแต่วันที่", "From")}
                      <input
                        type="date"
                        name="from"
                        required
                        defaultValue={from ?? ""}
                        className="border-glass-border min-h-11 rounded-2xl border bg-input px-4 py-2 font-normal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      {t("ถึงวันที่", "To")}
                      <input
                        type="date"
                        name="to"
                        required
                        defaultValue={to ?? ""}
                        className="border-glass-border min-h-11 rounded-2xl border bg-input px-4 py-2 font-normal"
                      />
                    </label>
                    {rangeError && (
                      <p className="text-text-muted text-sm sm:col-span-2" role="alert">
                        {rangeError}
                      </p>
                    )}
                    <Button type="submit" className="sm:col-span-2 sm:justify-self-start">
                      {t("ใช้ช่วงนี้", "Apply range")}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <form action={applyDetails} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-[15px] font-medium">
                    {t("ประเภทรายการ", "Transaction type")}
                    <select
                      name="kind"
                      defaultValue={params.get("kind") ?? ""}
                      className="border-glass-border rounded-2xl border bg-input px-4 py-2.5 font-normal"
                    >
                      <option value="">{t("รายรับและรายจ่าย", "Income and expenses")}</option>
                      <option value="income">{t("รายรับ", "Income")}</option>
                      <option value="expense">{t("รายจ่าย", "Expenses")}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[15px] font-medium">
                    {t("หมวดหมู่", "Category")}
                    <select
                      name="category"
                      defaultValue={params.get("category") ?? ""}
                      className="border-glass-border rounded-2xl border bg-input px-4 py-2.5 font-normal"
                    >
                      <option value="">{t("ทุกหมวด", "All categories")}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {localizeDefaultName(locale, category.name)} ({category.kind === "income" ? t("รายรับ", "Income") : t("รายจ่าย", "Expenses")})
                        </option>
                      ))}
                    </select>
                  </label>
                  {accounts.length > 0 && (
                    <label className="flex flex-col gap-1.5 text-[15px] font-medium">
                      {t("บัญชี", "Account")}
                      <select
                        name="account"
                        defaultValue={params.get("account") ?? ""}
                        className="border-glass-border rounded-2xl border bg-input px-4 py-2.5 font-normal"
                      >
                        <option value="">{t("ทุกบัญชี", "All accounts")}</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="flex flex-col gap-1.5 text-[15px] font-medium">
                    {t("คำในบันทึกย่อ", "Words in note")}
                    <input
                      name="q"
                      maxLength={100}
                      defaultValue={params.get("q") ?? ""}
                      className="border-glass-border rounded-2xl border bg-input px-4 py-2.5 font-normal"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[15px] font-medium">
                    {t("เงินตั้งแต่", "Minimum amount")}
                    <input
                      type="number"
                      name="min"
                      min="0"
                      step="0.01"
                      defaultValue={params.get("min") ?? ""}
                      className="border-glass-border tabular rounded-2xl border bg-input px-4 py-2.5 font-normal"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[15px] font-medium">
                    {t("เงินถึง", "Maximum amount")}
                    <input
                      type="number"
                      name="max"
                      min="0"
                      step="0.01"
                      defaultValue={params.get("max") ?? ""}
                      className="border-glass-border tabular rounded-2xl border bg-input px-4 py-2.5 font-normal"
                    />
                  </label>
                </div>

                {detailError && (
                  <p className="text-text-muted text-sm" role="alert">
                    {detailError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">{t("ใช้ตัวกรอง", "Apply filters")}</Button>
                  <Button type="button" variant="secondary" onClick={clearDetails}>
                    {t("ล้างตัวกรอง", "Clear filters")}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}

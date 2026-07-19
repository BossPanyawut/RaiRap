"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useLocale } from "@/components/locale-provider";

type Operator = "+" | "−" | "×" | "÷";

const MAX_AMOUNT = 9_999_999_999.99;

function calculate(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right;
  if (operator === "−") return left - right;
  if (operator === "×") return left * right;
  if (right === 0) return null;
  return left / right;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toAmount(value: number) {
  return String(roundMoney(value));
}

function toDisplay(value: string) {
  const number = Number(value);
  if (!value || !Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(number);
}

export function AmountCalculatorField({
  id,
  defaultValue,
}: {
  id: string;
  defaultValue?: number;
}) {
  const { t } = useLocale();
  const initialAmount = defaultValue == null ? "" : String(defaultValue);
  const [amount, setAmount] = useState(initialAmount);
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(initialAmount || "0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForNumber, setWaitingForNumber] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    const reset = () => {
      setAmount(initialAmount);
      setOpen(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initialAmount]);

  function clearError() {
    if (error) setError("");
  }

  function openCalculator() {
    setDisplay(amount && Number.isFinite(Number(amount)) ? amount : "0");
    setStored(null);
    setOperator(null);
    setWaitingForNumber(false);
    setError("");
    setOpen(true);
  }

  function inputDigit(digit: string) {
    clearError();
    if (error || waitingForNumber) {
      setDisplay(digit);
      setWaitingForNumber(false);
      return;
    }

    const digitCount = display.replace(/\D/g, "").length;
    if (digitCount >= 12) return;
    setDisplay(display === "0" ? digit : `${display}${digit}`);
  }

  function inputDecimal() {
    clearError();
    if (error || waitingForNumber) {
      setDisplay("0.");
      setWaitingForNumber(false);
      return;
    }
    if (!display.includes(".")) setDisplay(`${display}.`);
  }

  function setCalculationError(message: string) {
    setError(message);
    setStored(null);
    setOperator(null);
    setWaitingForNumber(true);
  }

  function runCalculation(left: number, right: number, nextOperator: Operator) {
    const rawResult = calculate(left, right, nextOperator);
    if (rawResult == null) {
      setCalculationError(t("หารด้วยศูนย์ไม่ได้", "Cannot divide by zero"));
      return null;
    }
    const result = roundMoney(rawResult);
    if (!Number.isFinite(result) || Math.abs(result) > MAX_AMOUNT) {
      setCalculationError(t("จำนวนเงินเกินที่ระบบเก็บได้", "Amount exceeds the supported limit"));
      return null;
    }
    if (result < 0) {
      setCalculationError(t("ผลลัพธ์ต้องไม่ติดลบ", "The result cannot be negative"));
      return null;
    }
    return result;
  }

  function chooseOperator(nextOperator: Operator) {
    clearError();
    if (error) return;

    const current = Number(display);
    if (!Number.isFinite(current)) return;

    if (stored !== null && operator && !waitingForNumber) {
      const result = runCalculation(stored, current, operator);
      if (result == null) return;
      setStored(result);
      setDisplay(toAmount(result));
    } else if (stored === null) {
      setStored(current);
    }

    setOperator(nextOperator);
    setWaitingForNumber(true);
  }

  function useResult() {
    if (error) return;

    let result = Number(display);
    if (stored !== null && operator && !waitingForNumber) {
      const calculated = runCalculation(stored, result, operator);
      if (calculated == null) return;
      result = calculated;
    }
    if (!Number.isFinite(result) || result > MAX_AMOUNT || result < 0) {
      setCalculationError(t("จำนวนเงินไม่ถูกต้อง", "Invalid amount"));
      return;
    }

    const nextAmount = toAmount(result);
    setDisplay(nextAmount);
    setAmount(nextAmount === "0" ? "" : nextAmount);
    setStored(null);
    setOperator(null);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function percent() {
    clearError();
    if (error) return;
    const result = roundMoney(Number(display) / 100);
    setDisplay(toAmount(result));
    setWaitingForNumber(false);
  }

  function backspace() {
    clearError();
    if (error || waitingForNumber) {
      setDisplay("0");
      setWaitingForNumber(false);
      return;
    }
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  }

  function allClear() {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setWaitingForNumber(false);
    setError("");
  }

  const keyClass =
    "min-h-13 rounded-2xl border border-glass-border bg-input-focus text-lg font-medium transition-colors duration-400 ease-in-out hover:bg-hover";
  const operatorClass =
    "min-h-13 rounded-2xl bg-accent-primary-strong text-lg font-medium text-white transition-colors duration-400 ease-in-out hover:opacity-90";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-medium">
        {t("จำนวนเงิน", "Amount")}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max={MAX_AMOUNT}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={cn(
            "money border-glass-border w-full rounded-2xl border bg-input py-2.5 pr-14 pl-4 text-2xl",
            "transition-colors duration-400 ease-in-out focus:bg-input-focus",
          )}
          required
        />
        <button
          type="button"
          aria-label={open ? t("ปิดเครื่องคิดเลข", "Close calculator") : t("เปิดเครื่องคิดเลข", "Open calculator")}
          aria-expanded={open}
          aria-controls={`${id}-calculator`}
          onClick={open ? () => setOpen(false) : openCalculator}
          data-open-amount-calculator
          className="text-link absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-hover"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
            <path d="M8 6h8v3H8zM8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01" />
          </svg>
        </button>
      </div>

      {open && (
        <section
          id={`${id}-calculator`}
          aria-label={t("เครื่องคิดเลขจำนวนเงิน", "Amount calculator")}
          data-amount-calculator
          className="border-glass-border fixed right-0 bottom-0 left-0 z-[60] max-h-[72dvh] overflow-y-auto rounded-t-[24px] border bg-bg-bottom px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-16px_48px_rgb(20_76_140/0.22)] sm:right-auto sm:left-1/2 sm:w-[30rem] sm:-translate-x-1/2 sm:bottom-4 sm:rounded-[24px] sm:p-5"
        >
          <div className="bg-text-muted/35 mx-auto mb-2 h-1 w-10 rounded-full sm:hidden" aria-hidden="true" />
          <div className="mb-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-text-muted text-sm">
                {stored !== null && operator ? `${toDisplay(String(stored))} ${operator}` : t("เครื่องคิดเลข", "Calculator")}
              </p>
              <output
                aria-live="polite"
                className="money block truncate text-3xl font-semibold"
              >
                {error || toDisplay(display)}
              </output>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              data-close-amount-calculator
              className="text-link min-h-11 rounded-full px-3 text-sm hover:bg-hover"
            >
              {t("ปิด", "Close")}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2" aria-label={t("แป้นเครื่องคิดเลข", "Calculator keypad")}>
            <button type="button" onClick={allClear} className={cn(keyClass, "col-span-2 text-link")} data-calculator-key="clear">
              AC
            </button>
            <button type="button" onClick={percent} className={keyClass} data-calculator-key="percent" aria-label={t("เปอร์เซ็นต์", "Percent")}>
              %
            </button>
            <button type="button" onClick={() => chooseOperator("÷")} className={operatorClass} data-calculator-key="divide" aria-label={t("หาร", "Divide")}>
              ÷
            </button>

            {["7", "8", "9"].map((digit) => (
              <button key={digit} type="button" onClick={() => inputDigit(digit)} className={keyClass} data-calculator-key={digit}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => chooseOperator("×")} className={operatorClass} data-calculator-key="multiply" aria-label={t("คูณ", "Multiply")}>×</button>

            {["4", "5", "6"].map((digit) => (
              <button key={digit} type="button" onClick={() => inputDigit(digit)} className={keyClass} data-calculator-key={digit}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => chooseOperator("−")} className={operatorClass} data-calculator-key="subtract" aria-label={t("ลบ", "Subtract")}>−</button>

            {["1", "2", "3"].map((digit) => (
              <button key={digit} type="button" onClick={() => inputDigit(digit)} className={keyClass} data-calculator-key={digit}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => chooseOperator("+")} className={operatorClass} data-calculator-key="add" aria-label={t("บวก", "Add")}>+</button>

            <button type="button" onClick={inputDecimal} className={keyClass} data-calculator-key="decimal" aria-label={t("จุดทศนิยม", "Decimal point")}>.</button>
            <button type="button" onClick={() => inputDigit("0")} className={keyClass} data-calculator-key="0">0</button>
            <button type="button" onClick={backspace} className={keyClass} data-calculator-key="backspace" aria-label={t("ลบทีละหลัก", "Backspace")}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6H9l-5 6 5 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z" />
                <path d="m11 9 6 6m0-6-6 6" />
              </svg>
            </button>
            <button type="button" onClick={useResult} className={operatorClass} data-calculator-key="equals" aria-label={t("ใช้ผลลัพธ์", "Use result")}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

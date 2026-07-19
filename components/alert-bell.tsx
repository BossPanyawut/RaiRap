"use client";

import { useEffect, useRef, useState } from "react";
import { dismissAlert } from "@/app/(app)/alert-actions";
import type { Alert } from "@/lib/alerts";
import { localeCopy, type Locale } from "@/lib/locale";
import { formatMoney, type Currency } from "@/lib/money";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 0 0 10 2.5Z" />
      <path d="M8.5 14.5a1.75 1.75 0 0 0 3 0" />
    </svg>
  );
}

export function AlertBell({
  alerts,
  currency,
  locale,
}: {
  alerts: Alert[];
  currency: Currency;
  locale: Locale;
}) {
  const copy = localeCopy[locale].alerts;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        // จำนวนอยู่ในชื่อปุ่ม ไม่ใช่แค่จุดสีบนไอคอน — screen reader ต้องรู้ว่ามีกี่อัน
        aria-label={
          alerts.length ? copy.buttonCount(alerts.length) : copy.buttonEmpty
        }
        className="text-text-muted relative flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors duration-400 ease-in-out hover:bg-hover"
      >
        <BellIcon className="size-5" />
        {alerts.length > 0 && (
          <span
            aria-hidden="true"
            className="bg-accent-primary-strong absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white"
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={copy.title}
          className="glass absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] p-4"
        >
          <h2 className="text-[15px] font-semibold">{copy.title}</h2>

          {alerts.length === 0 ? (
            <p className="text-text-muted mt-2 text-sm">
              {copy.empty}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {alerts.map((a) => (
                <li
                  key={`${a.categoryId}:${a.threshold}`}
                  className="border-glass-border flex items-start gap-2 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">
                      {a.threshold === 100
                        ? copy.over(a.categoryName)
                        : copy.near(a.categoryName)}
                    </p>
                    <p className="text-text-muted text-sm">
                      {copy.usage(
                        formatMoney(a.spent, currency),
                        formatMoney(a.budget, currency),
                        Math.round(a.pct),
                      )}
                    </p>
                  </div>
                  <form action={dismissAlert}>
                    <input type="hidden" name="categoryId" value={a.categoryId} />
                    <input type="hidden" name="periodMonth" value={a.periodMonth} />
                    <input type="hidden" name="threshold" value={a.threshold} />
                    <button
                      type="submit"
                      className="text-text-muted shrink-0 rounded-full px-2 py-1 text-sm hover:bg-hover"
                      aria-label={copy.dismissLabel(a.categoryName)}
                    >
                      {copy.dismiss}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

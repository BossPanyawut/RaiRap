"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { localizeSystemMessage } from "@/lib/locale";

/**
 * ข้อความบอกสถานะที่ผู้ใช้ต้องอ่าน — spec §9: บอกตรง ๆ ไม่ตำหนิ ไม่ขอโทษ
 * ไม่ใช้สีแดง (spec §3) จึงต้องมีไอคอนคู่กับข้อความเสมอ ไม่สื่อด้วยสีอย่างเดียว
 */
export function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { locale } = useLocale();
  const content = typeof children === "string"
    ? localizeSystemMessage(locale, children)
    : children;

  return (
    <p
      role="alert"
      className={cn(
        "border-accent-warn/60 flex items-start gap-2 rounded-2xl border bg-input px-4 py-3 text-[15px]",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" />
        <path d="M8 6.75v2.5" />
        <path d="M8 11.75h.01" />
      </svg>
      <span>{content}</span>
    </p>
  );
}

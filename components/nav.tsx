"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "ภาพรวม" },
  { href: "/transactions", label: "รายการ" },
  { href: "/budgets", label: "งบ" },
  { href: "/analytics", label: "วิเคราะห์" },
  { href: "/categories", label: "หมวดหมู่" },
];

export function Nav({
  displayName,
  signOut,
}: {
  displayName: string | null;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <header className="glass sticky top-0 z-20 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-5xl items-center gap-1 rounded-full px-3 py-2 sm:gap-2 sm:px-5">
      <Link href="/" className="hidden shrink-0 px-2 font-semibold sm:block">
        RaiRap
      </Link>

      {/* 5 เมนูไม่พอดี 360px — ให้แถบเมนูเลื่อนในตัวเอง หน้าเว็บทั้งหน้าจะได้ไม่เลื่อนแนวนอน */}
      <nav
        className="scrollbar-none flex min-w-0 flex-1 gap-0.5 overflow-x-auto sm:gap-1"
        aria-label="เมนูหลัก"
      >
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-400 ease-in-out",
                active
                  ? "bg-accent-primary-strong text-white"
                  : "text-text-muted hover:bg-white/60",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {displayName && (
        // ชื่อคนห้ามตัดกลาง — dictionary breaking ของไทยจะหั่นชื่อที่รอยต่อคำ
        <span className="text-text-muted hidden shrink-0 px-2 text-sm whitespace-nowrap lg:block">
          {displayName}
        </span>
      )}

      <form action={signOut} className="shrink-0">
        <button
          type="submit"
          className="text-text-muted rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-400 ease-in-out hover:bg-white/60"
        >
          ออก
        </button>
      </form>
    </header>
  );
}

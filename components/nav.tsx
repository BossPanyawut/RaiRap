"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertBell } from "@/components/alert-bell";
import { cn } from "@/lib/cn";
import type { Alert } from "@/lib/alerts";
import { localeCopy, type Locale } from "@/lib/locale";
import type { Currency } from "@/lib/money";

type NavIconName = "overview" | "transactions" | "profile";

const profilePaths = [
  "/profile",
  "/report",
  "/accounts",
  "/recurring",
  "/categories",
  "/settings",
  "/budgets",
  "/goals",
  "/analytics",
];

function ProfileIcon({ className }: { className?: string }) {
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
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 16.5c.7-3 2.7-4.5 6-4.5s5.3 1.5 6 4.5" />
    </svg>
  );
}

function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const paths: Record<NavIconName, React.ReactNode> = {
    overview: (
      <>
        <path d="m3 9 7-6 7 6" />
        <path d="M5 8v9h10V8M8 17v-5h4v5" />
      </>
    ),
    transactions: (
      <>
        <path d="M5 5h10M5 10h10M5 15h10" />
        <path d="M2.5 5h.01M2.5 10h.01M2.5 15h.01" />
      </>
    ),
    profile: (
      <>
        <circle cx="10" cy="6.5" r="3" />
        <path d="M4 16.5c.7-3 2.7-4.5 6-4.5s5.3 1.5 6 4.5" />
      </>
    ),
  };

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
      {paths[name]}
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function ProfileLink({
  active,
  label,
  profileText,
  showLabel,
}: {
  active: boolean;
  label: string;
  profileText: string;
  showLabel: boolean;
}) {
  return (
    <Link
      href="/profile"
      aria-current={active ? "page" : undefined}
      aria-label={`${profileText}: ${label}`}
      className={cn(
        "flex min-h-11 min-w-11 max-w-44 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm transition-colors duration-400 ease-in-out",
        active
          ? "bg-accent-primary-strong text-white"
          : "text-text-muted hover:bg-hover",
      )}
    >
      <ProfileIcon className="size-5 shrink-0" />
      {showLabel && (
        // ชื่อคนห้ามตัดกลาง — ถ้ายาวเกินพื้นที่ให้ตัดด้วย … ไม่ขึ้นบรรทัดใหม่
        <span className="hidden truncate whitespace-nowrap lg:block">{label}</span>
      )}
    </Link>
  );
}

export function Nav({
  displayName,
  alerts,
  currency,
  locale,
}: {
  displayName: string | null;
  alerts: Alert[];
  currency: Currency;
  locale: Locale;
}) {
  const pathname = usePathname();
  const copy = localeCopy[locale].nav;
  const desktopLinks: { href: string; label: string; icon: NavIconName }[] = [
    { href: "/", label: copy.overview, icon: "overview" },
    { href: "/transactions", label: copy.transactions, icon: "transactions" },
  ];
  const mobileLinks = [
    ...desktopLinks,
    { href: "/profile", label: copy.profile, icon: "profile" as const },
  ];
  const profileActive = profilePaths.some((path) => pathname.startsWith(path));
  const profileLabel = displayName?.trim() || copy.profile;

  return (
    <>
      {/* มือถือแยก utility bar ออกจาก navigation เพื่อให้แต่ละส่วนมีพื้นที่กดเต็มนิ้ว */}
      <header
        data-mobile-topbar
        className="glass sticky top-[calc(0.75rem+env(safe-area-inset-top))] z-20 mx-auto mt-[calc(0.75rem+env(safe-area-inset-top))] flex w-[calc(100%-2rem)] items-center px-3 py-1.5 sm:hidden"
      >
        <Link href="/" className="flex min-h-11 min-w-11 items-center px-2 font-semibold">
          RaiRap
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <AlertBell alerts={alerts} currency={currency} locale={locale} />
        </div>
      </header>

      <nav
        data-mobile-nav
        aria-label={copy.mobileMain}
        className="glass fixed right-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-2 z-30 grid grid-cols-3 gap-1 p-1.5 sm:hidden"
      >
        {mobileLinks.map((l) => {
          const active = l.href === "/profile" ? profileActive : isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 py-1 text-xs whitespace-nowrap transition-colors duration-400 ease-in-out",
                active
                  ? "bg-accent-primary-strong text-white"
                  : "text-text-muted hover:bg-hover",
              )}
            >
              <NavIcon name={l.icon} className="size-5" />
              <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <header
        data-desktop-nav
        className="glass sticky top-0 z-20 mx-auto mt-4 hidden w-[calc(100%-2rem)] max-w-5xl items-center gap-2 rounded-full px-5 py-2 sm:flex"
      >
        <Link href="/" className="shrink-0 px-2 font-semibold">
          RaiRap
        </Link>

        <nav className="flex min-w-0 flex-1 gap-1" aria-label={copy.main}>
          {desktopLinks.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-400 ease-in-out",
                  active
                    ? "bg-accent-primary-strong text-white"
                    : "text-text-muted hover:bg-hover",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <AlertBell alerts={alerts} currency={currency} locale={locale} />
        <ProfileLink
          active={profileActive}
          label={profileLabel}
          profileText={copy.profile}
          showLabel
        />
      </header>
    </>
  );
}

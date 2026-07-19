import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n-server";

/**
 * โครงหน้าสาธารณะ (landing, terms, privacy) — ไม่มี session ก็เข้าได้
 * proxy.ts เปิดทางให้ /welcome /terms /privacy โดยไม่เด้งไป /login
 */
export default async function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { t } = await getI18n();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 p-4 sm:p-6">
        <Link
          href="/welcome"
          className="money text-xl font-semibold tracking-tight"
        >
          RaiRap
        </Link>
        <nav
          aria-label={t("เมนูหน้าแรก", "Landing navigation")}
          className="flex items-center gap-2"
        >
          <ButtonLink href="/login" variant="secondary">
            {t("เข้าสู่ระบบ", "Sign in")}
          </ButtonLink>
          <ButtonLink href="/signup" className="hidden sm:inline-flex">
            {t("สมัครใช้งาน", "Create account")}
          </ButtonLink>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <div className="text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-glass-border pt-4 text-sm">
          <span className="money">© {new Date().getFullYear()} RaiRap</span>
          <Link href="/terms" className="text-link underline">
            {t("เงื่อนไขการใช้งาน", "Terms of service")}
          </Link>
          <Link href="/privacy" className="text-link underline">
            {t("นโยบายความเป็นส่วนตัว", "Privacy policy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

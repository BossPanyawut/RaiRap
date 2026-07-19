import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PreferenceSettings } from "@/components/preference-settings";
import { localeCopy } from "@/lib/locale";
import { getLocale } from "@/lib/locale-server";
import { getSettings } from "@/lib/profile";
import { getTheme } from "@/lib/theme";

type MenuLink = { href: string; label: string; description: string };

function MenuGroup({
  title,
  links,
}: {
  title: string;
  links: MenuLink[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[15px] font-semibold">{title}</h2>
      <GlassCard className="p-2">
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition-colors duration-400 ease-in-out hover:bg-hover"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">
                    {link.label}
                  </span>
                  <span className="text-text-muted block text-sm">
                    {link.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-text-muted shrink-0 transition-transform duration-400 ease-in-out group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}

export default async function ProfilePage() {
  const [settings, theme, locale] = await Promise.all([
    getSettings(),
    getTheme(),
    getLocale(),
  ]);
  const copy = localeCopy[locale].profile;
  const displayName = settings!.displayName?.trim() || copy.fallbackName;
  const initial = Array.from(displayName)[0] ?? "R";
  const link = (href: string, value: readonly [string, string]): MenuLink => ({
    href,
    label: value[0],
    description: value[1],
  });
  const everydayTools = [
    link("/budgets", copy.links.budgets),
    link("/goals", copy.links.goals),
    link("/analytics", copy.links.analytics),
  ];
  const moneyTools = [
    link("/accounts", copy.links.accounts),
    link("/recurring", copy.links.recurring),
    link("/categories", copy.links.categories),
  ];
  const accountTools = [
    link("/report", copy.links.report),
    link("/settings", copy.links.settings),
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">{copy.title}</h1>

      <GlassCard className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="bg-accent-primary-strong flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold whitespace-nowrap">
            {displayName}
          </p>
          <p className="text-text-muted truncate text-sm">{settings!.email}</p>
        </div>
      </GlassCard>

      <PreferenceSettings theme={theme} locale={locale} />
      <MenuGroup title={copy.everyday} links={everydayTools} />
      <MenuGroup title={copy.moneyTools} links={moneyTools} />
      <MenuGroup title={copy.accountTools} links={accountTools} />

      <form action={signOut} className="px-1">
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          {copy.signOut}
        </Button>
      </form>
    </main>
  );
}

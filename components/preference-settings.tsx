"use client";

import { setLocale } from "@/app/(app)/locale-actions";
import { setTheme } from "@/app/(app)/theme-actions";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/cn";
import { localeCopy, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";

const optionClass =
  "flex min-h-11 flex-1 items-center justify-center rounded-full px-4 py-2 text-[15px] font-medium transition-colors duration-400 ease-in-out";

export function PreferenceSettings({
  theme,
  locale,
}: {
  theme: Theme;
  locale: Locale;
}) {
  const copy = localeCopy[locale].preferences;

  return (
    <GlassCard className="p-5 sm:p-6" data-preference-settings>
      <h2 className="text-xl font-semibold">{copy.title}</h2>

      <div className="mt-4 flex flex-col gap-5">
        <section aria-labelledby="theme-setting-title">
          <h3 id="theme-setting-title" className="text-[15px] font-medium">
            {copy.theme}
          </h3>
          <p className="text-text-muted text-sm">{copy.themeHint}</p>
          <form action={setTheme} className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((value) => (
              <button
                key={value}
                type="submit"
                name="theme"
                value={value}
                aria-pressed={theme === value}
                data-theme-option={value}
                className={cn(
                  optionClass,
                  theme === value
                    ? "bg-accent-primary-strong text-white"
                    : "border-glass-border text-text-muted border bg-input hover:bg-hover",
                )}
              >
                {value === "light" ? copy.light : copy.dark}
              </button>
            ))}
          </form>
        </section>

        <section aria-labelledby="language-setting-title">
          <h3 id="language-setting-title" className="text-[15px] font-medium">
            {copy.language}
          </h3>
          <p className="text-text-muted text-sm">{copy.languageHint}</p>
          <form action={setLocale} className="mt-2 flex gap-2">
            {(["th", "en"] as const).map((value) => (
              <button
                key={value}
                type="submit"
                name="locale"
                value={value}
                aria-pressed={locale === value}
                data-locale-option={value}
                className={cn(
                  optionClass,
                  locale === value
                    ? "bg-accent-primary-strong text-white"
                    : "border-glass-border text-text-muted border bg-input hover:bg-hover",
                )}
              >
                {value === "th" ? copy.thai : copy.english}
              </button>
            ))}
          </form>
        </section>
      </div>
    </GlassCard>
  );
}


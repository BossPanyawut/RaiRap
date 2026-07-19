import { setLocale } from "@/app/(app)/locale-actions";
import { setTheme } from "@/app/(app)/theme-actions";
import { localeCopy, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";

const buttonClass =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-glass-border bg-input px-3 text-sm font-medium text-link backdrop-blur-[12px] transition-colors duration-400 ease-in-out hover:bg-hover";

export function MarketingPreferences({ theme, locale }: { theme: Theme; locale: Locale }) {
  const copy = localeCopy[locale].preferences;
  const otherTheme: Theme = theme === "dark" ? "light" : "dark";
  const otherLocale: Locale = locale === "th" ? "en" : "th";

  return (
    <div className="flex items-center gap-2">
      <form action={setTheme}>
        <input type="hidden" name="theme" value={otherTheme} />
        <button
          type="submit"
          aria-label={otherTheme === "dark" ? copy.dark : copy.light}
          className={buttonClass}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5" fill="currentColor">
              <path d="M10 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 12a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7-5a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 10a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm9.19-4.19a1 1 0 0 1 0 1.41l-.7.7a1 1 0 1 1-1.42-1.41l.71-.71a1 1 0 0 1 1.41 0ZM7.93 12.36a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0Zm6.56 1.41a1 1 0 0 1-1.41 0l-.71-.7a1 1 0 1 1 1.41-1.42l.71.71a1 1 0 0 1 0 1.41ZM6.51 5.81a1 1 0 0 1-1.41 0l-.71-.7A1 1 0 1 1 5.8 3.7l.71.71a1 1 0 0 1 0 1.4ZM10 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5" fill="currentColor">
              <path d="M17.29 12.7a7 7 0 0 1-9.99-9.98 1 1 0 0 0-1.19-1.42A9 9 0 1 0 18.7 13.9a1 1 0 0 0-1.41-1.2Z" />
            </svg>
          )}
        </button>
      </form>

      <form action={setLocale}>
        <input type="hidden" name="locale" value={otherLocale} />
        <button
          type="submit"
          aria-label={otherLocale === "th" ? copy.thai : copy.english}
          className={buttonClass}
        >
          {locale === "th" ? "EN" : "ไทย"}
        </button>
      </form>
    </div>
  );
}

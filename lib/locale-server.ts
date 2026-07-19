import "server-only";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "th";
}

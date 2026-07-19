import "server-only";

import { localize } from "@/lib/locale";
import { getLocale } from "@/lib/locale-server";

export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: (thai: string, english: string) => localize(locale, thai, english),
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";

export async function setLocale(formData: FormData) {
  const next: Locale = formData.get("locale") === "en" ? "en" : "th";
  const store = await cookies();

  store.set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  revalidatePath("/", "layout");
}


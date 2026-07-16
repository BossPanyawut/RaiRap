"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

export async function setTheme(formData: FormData) {
  const next: Theme = formData.get("theme") === "dark" ? "dark" : "light";
  const store = await cookies();

  store.set(THEME_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  revalidatePath("/", "layout");
}

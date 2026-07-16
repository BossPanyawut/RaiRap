"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const dismissInput = z.object({
  categoryId: z.uuid(),
  periodMonth: z.iso.date(),
  threshold: z.coerce.number().pipe(z.union([z.literal(80), z.literal(100)])),
});

export async function dismissAlert(formData: FormData) {
  const parsed = dismissInput.safeParse({
    categoryId: formData.get("categoryId"),
    periodMonth: formData.get("periodMonth"),
    threshold: formData.get("threshold"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("dismissed_alerts").upsert(
    {
      user_id: user.id,
      category_id: parsed.data.categoryId,
      period_month: parsed.data.periodMonth,
      threshold: parsed.data.threshold,
    },
    { onConflict: "user_id,category_id,period_month,threshold" },
  );

  revalidatePath("/", "layout");
}

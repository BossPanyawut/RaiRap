import { cache } from "react";
import { DEFAULT_CURRENCY, isCurrency, type Currency } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type Settings = {
  userId: string;
  email: string;
  displayName: string | null;
  currency: Currency;
  cycleStartDay: number;
};

/**
 * ค่าตั้งของผู้ใช้ปัจจุบัน — `cache()` ทำให้หลายหน้า/คอมโพเนนต์ในคำขอเดียวกัน
 * ยิง query ครั้งเดียว ห้ามเก็บเป็นตัวแปรระดับโมดูล เพราะ server component
 * แชร์โมดูลข้ามคำขอ ค่าของผู้ใช้คนหนึ่งจะรั่วไปหาอีกคน
 */
export const getSettings = cache(async (): Promise<Settings | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("display_name, currency, cycle_start_day")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: data?.display_name ?? null,
    currency: isCurrency(data?.currency) ? data.currency : DEFAULT_CURRENCY,
    cycleStartDay: data?.cycle_start_day ?? 1,
  };
});

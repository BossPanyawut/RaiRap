import { RecurringManager, type Rule } from "@/components/recurring-manager";
import { todayISO } from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function RecurringPage() {
  const { currency } = (await getSettings())!;
  const { t } = await getI18n();
  const supabase = await createClient();

  const [{ data: rules }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from("recurring_rules")
      .select("*, categories(name), accounts(name)")
      .order("is_paused")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, kind")
      .eq("is_archived", false)
      .order("kind")
      .order("sort_order"),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("is_archived", false)
      .order("name"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <div className="px-1">
        <h1 className="text-2xl font-semibold">{t("รายการเกิดซ้ำ", "Recurring transactions")}</h1>
        <p className="text-text-muted mt-1 text-sm">
          {t("ค่าเช่า ค่าสมาชิก เงินเดือน — ตั้งครั้งเดียวแล้วระบบบันทึกให้เอง", "Rent, subscriptions, salary—set them once and let the app record them.")}
        </p>
      </div>

      <RecurringManager
        rules={(rules ?? []) as Rule[]}
        categories={categories ?? []}
        accounts={accounts ?? []}
        today={todayISO()}
        currency={currency}
      />
    </main>
  );
}

import { AccountsManager, type AccountRow } from "@/components/accounts-manager";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSettings } from "@/lib/profile";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  const { currency } = (await getSettings())!;
  const { t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_account_balance")
    .select("*")
    .order("is_archived")
    .order("name");

  const rows = (data ?? []) as AccountRow[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <div className="px-1">
        <h1 className="text-2xl font-semibold">{t("บัญชีและกระเป๋าเงิน", "Accounts and wallets")}</h1>
        <p className="text-text-muted mt-1 text-sm">
          {t("แยกดูว่าเงินอยู่ที่ไหน — เลือกบัญชีตอนบันทึกรายการ", "See where your money is held, then choose an account when recording a transaction.")}
        </p>
      </div>

      {rows.length === 0 && (
        <GlassCard className="p-0">
          <EmptyState title={t("ยังไม่มีบัญชี เพิ่มสักอันแล้วจะเลือกได้ตอนบันทึกรายการ", "No accounts yet. Add one to select it when recording a transaction.")} />
        </GlassCard>
      )}

      <AccountsManager rows={rows} currency={currency} />
    </main>
  );
}

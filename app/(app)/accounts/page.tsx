import { AccountsManager, type AccountRow } from "@/components/accounts-manager";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  const { currency } = (await getSettings())!;
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
        <h1 className="text-2xl font-semibold">บัญชีและกระเป๋าเงิน</h1>
        <p className="text-text-muted mt-1 text-sm">
          แยกดูว่าเงินอยู่ที่ไหน — เลือกบัญชีตอนบันทึกรายการ
        </p>
      </div>

      {rows.length === 0 && (
        <GlassCard className="p-0">
          <EmptyState title="ยังไม่มีบัญชี เพิ่มสักอันแล้วจะเลือกได้ตอนบันทึกรายการ" />
        </GlassCard>
      )}

      <AccountsManager rows={rows} currency={currency} />
    </main>
  );
}

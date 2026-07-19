import { toCSV, type ExportRow } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { locale, t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(t("ต้องเข้าสู่ระบบก่อน", "Sign in first"), { status: 401 });

  // RLS จำกัดให้เหลือแถวของเจ้าของอยู่แล้ว ไม่ต้องกรอง user_id เอง
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, kind, amount, note, categories(name)")
    .order("occurred_on", { ascending: true });

  if (error) return new Response(t("ดึงข้อมูลไม่สำเร็จ", "Could not retrieve your data"), { status: 500 });

  const rows: ExportRow[] = (data ?? []).map((transaction) => ({
    occurred_on: transaction.occurred_on,
    kind: transaction.kind,
    // Category names are user data. Keep the stored value so export → import
    // round-trips without creating a translated duplicate category.
    category: transaction.categories?.name ?? t("หมวดที่ถูกลบ", "Deleted category"),
    amount: Number(transaction.amount),
    note: transaction.note,
  }));

  return new Response(toCSV(rows, locale), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rairap-${todayISO()}.csv"`,
      // ไฟล์นี้เป็นข้อมูลการเงินส่วนตัว ห้ามให้ตัวกลางไหนเก็บไว้
      "Cache-Control": "no-store, private",
    },
  });
}

import { toCSV, type ExportRow } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("ต้องเข้าสู่ระบบก่อน", { status: 401 });

  // RLS จำกัดให้เหลือแถวของเจ้าของอยู่แล้ว ไม่ต้องกรอง user_id เอง
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, kind, amount, note, categories(name)")
    .order("occurred_on", { ascending: true });

  if (error) return new Response("ดึงข้อมูลไม่สำเร็จ", { status: 500 });

  const rows: ExportRow[] = (data ?? []).map((t) => ({
    occurred_on: t.occurred_on,
    kind: t.kind,
    category: t.categories?.name ?? "หมวดที่ถูกลบ",
    amount: Number(t.amount),
    note: t.note,
  }));

  return new Response(toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rairap-${todayISO()}.csv"`,
      // ไฟล์นี้เป็นข้อมูลการเงินส่วนตัว ห้ามให้ตัวกลางไหนเก็บไว้
      "Cache-Control": "no-store, private",
    },
  });
}

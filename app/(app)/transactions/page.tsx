import { z } from "zod";
import { TransactionFilters } from "@/components/transaction-filters";
import {
  AddTransactionCard,
  TransactionList,
  type TransactionRow,
} from "@/components/transaction-list";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// ค่าที่มาจาก URL ไม่น่าเชื่อถือ — parse ทิ้งค่าขยะ แทนที่จะยัดเข้า query ตรง ๆ
const filters = z.object({
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  category: z.uuid().optional().catch(undefined),
  min: z.coerce.number().nonnegative().optional().catch(undefined),
  max: z.coerce.number().nonnegative().optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
});

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const f = filters.parse({
    from: raw.from || undefined,
    to: raw.to || undefined,
    category: raw.category || undefined,
    min: raw.min || undefined,
    max: raw.max || undefined,
    q: raw.q || undefined,
  });

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("is_archived", false)
    .order("kind")
    .order("sort_order");

  let query = supabase
    .from("transactions")
    .select("id, category_id, kind, amount, occurred_on, note, categories(name)")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (f.from) query = query.gte("occurred_on", f.from);
  if (f.to) query = query.lte("occurred_on", f.to);
  if (f.category) query = query.eq("category_id", f.category);
  if (f.min !== undefined) query = query.gte("amount", f.min);
  if (f.max !== undefined) query = query.lte("amount", f.max);
  if (f.q) query = query.ilike("note", `%${f.q}%`);

  const { data: rows } = await query;
  const today = todayISO();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">รายการ</h1>

      <AddTransactionCard categories={categories ?? []} today={today} />

      <TransactionFilters categories={categories ?? []} />

      <TransactionList
        rows={(rows ?? []) as TransactionRow[]}
        categories={categories ?? []}
        today={today}
      />
    </main>
  );
}

import { z } from "zod";
import { Pagination } from "@/components/pagination";
import { TransactionFilters } from "@/components/transaction-filters";
import {
  AddTransactionCard,
  TransactionList,
  type TransactionRow,
} from "@/components/transaction-list";
import { todayISO } from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

// ค่าที่มาจาก URL ไม่น่าเชื่อถือ — parse ทิ้งค่าขยะ แทนที่จะยัดเข้า query ตรง ๆ
const filters = z.object({
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  category: z.uuid().optional().catch(undefined),
  account: z.uuid().optional().catch(undefined),
  min: z.coerce.number().nonnegative().optional().catch(undefined),
  max: z.coerce.number().nonnegative().optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { currency } = (await getSettings())!;
  const raw = await searchParams;
  const f = filters.parse({
    from: raw.from || undefined,
    to: raw.to || undefined,
    category: raw.category || undefined,
    account: raw.account || undefined,
    min: raw.min || undefined,
    max: raw.max || undefined,
    q: raw.q || undefined,
    page: raw.page || 1,
  });

  const supabase = await createClient();

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, kind")
      .eq("is_archived", false)
      .order("kind")
      .order("sort_order"),
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
  ]);

  // ตัวกรองชุดเดียวกันต้องใช้กับทั้ง count และ select ไม่งั้นเลขหน้าไม่ตรงกับผลลัพธ์
  // PostgREST builder เป็น immutable-ish จึงส่งต่อทีละขั้นแบบนี้ได้
  const countQuery = supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });
  const rowsQuery = supabase
    .from("transactions")
    .select(
      "id, category_id, account_id, kind, amount, occurred_on, note, receipt_path, categories(name), accounts(name)",
    );

  for (const q of [countQuery, rowsQuery]) {
    if (f.from) q.gte("occurred_on", f.from);
    if (f.to) q.lte("occurred_on", f.to);
    if (f.category) q.eq("category_id", f.category);
    if (f.account) q.eq("account_id", f.account);
    if (f.min !== undefined) q.gte("amount", f.min);
    if (f.max !== undefined) q.lte("amount", f.max);
    if (f.q) q.ilike("note", `%${f.q}%`);
  }

  const { count } = await countQuery;

  const total = count ?? 0;
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  // หน้าที่เกินช่วง (เช่นลบรายการจนหน้าหาย) ให้ตกมาหน้าสุดท้าย ไม่ใช่โชว์หน้าว่าง
  const page = Math.min(f.page, pages);
  const start = (page - 1) * PAGE_SIZE;

  const { data: rows } = await rowsQuery
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const today = todayISO();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">รายการ</h1>

      <AddTransactionCard
        categories={categories ?? []}
        accounts={accounts ?? []}
        today={today}
      />

      <TransactionFilters categories={categories ?? []} accounts={accounts ?? []} />

      <TransactionList
        rows={(rows ?? []) as TransactionRow[]}
        categories={categories ?? []}
        accounts={accounts ?? []}
        today={today}
        currency={currency}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </main>
  );
}

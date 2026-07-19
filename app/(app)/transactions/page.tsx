import { z } from "zod";
import { Pagination } from "@/components/pagination";
import {
  TransactionCalendar,
  type CalendarSummary,
} from "@/components/transaction-calendar";
import { TransactionFilters } from "@/components/transaction-filters";
import {
  AddTransactionCard,
  TransactionList,
  type TransactionRow,
} from "@/components/transaction-list";
import {
  todayISO,
  transactionPeriodRange,
  type TransactionPeriodScope,
} from "@/lib/dates";
import { getSettings } from "@/lib/profile";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

// ค่าที่มาจาก URL ไม่น่าเชื่อถือ — parse ทิ้งค่าขยะ แทนที่จะยัดเข้า query ตรง ๆ
const filters = z.object({
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  at: z.iso.date().optional().catch(undefined),
  scope: z.enum(["day", "week", "month", "year", "custom"]).catch("month"),
  view: z.enum(["list", "calendar"]).catch("list"),
  kind: z.enum(["income", "expense"]).optional().catch(undefined),
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
  const { t } = await getI18n();
  const today = todayISO();
  const raw = await searchParams;
  const f = filters.parse({
    from: raw.from || undefined,
    to: raw.to || undefined,
    at: raw.at || undefined,
    scope: raw.scope || undefined,
    view: raw.view || undefined,
    kind: raw.kind || undefined,
    category: raw.category || undefined,
    account: raw.account || undefined,
    min: raw.min || undefined,
    max: raw.max || undefined,
    q: raw.q || undefined,
    page: raw.page || 1,
  });
  const customRangeIsValid = Boolean(f.from && f.to && f.from <= f.to);
  const scope =
    f.scope === "custom" && !customRangeIsValid ? "month" : f.scope;
  const anchor = f.at ?? today;
  const range =
    scope === "custom"
      ? { from: f.from!, to: f.to! }
      : transactionPeriodRange(anchor, scope);
  // ปฏิทินต้องมีกรอบวัน/สัปดาห์/เดือน/ปีที่แน่นอน ช่วงกำหนดเองจึงใช้กับ list เท่านั้น
  const view = f.view === "calendar" && scope === "custom" ? "list" : f.view;

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

  let rows: TransactionRow[] = [];
  let total = 0;
  let page = 1;
  let summaries: CalendarSummary[] = [];

  if (view === "calendar") {
    const { data } = await supabase.rpc("transaction_calendar_summary", {
      p_from: range.from,
      p_to: range.to,
      p_scope: scope as TransactionPeriodScope,
      p_kind: f.kind ?? undefined,
      p_category: f.category ?? undefined,
      p_account: f.account ?? undefined,
      p_min: f.min,
      p_max: f.max,
      p_q: f.q,
    });
    summaries = (data ?? []) as CalendarSummary[];
  } else {
    // ตัวกรองชุดเดียวกันต้องใช้กับทั้ง count และ select ไม่งั้นเลขหน้าไม่ตรงกับผลลัพธ์
    const countQuery = supabase
      .from("transactions")
      .select("*", { count: "exact", head: true });
    const rowsQuery = supabase
      .from("transactions")
      .select(
        "id, category_id, account_id, kind, amount, occurred_on, note, receipt_path, categories(name), accounts(name)",
      );

    for (const query of [countQuery, rowsQuery]) {
      query.gte("occurred_on", range.from).lte("occurred_on", range.to);
      if (f.kind) query.eq("kind", f.kind);
      if (f.category) query.eq("category_id", f.category);
      if (f.account) query.eq("account_id", f.account);
      if (f.min !== undefined) query.gte("amount", f.min);
      if (f.max !== undefined) query.lte("amount", f.max);
      if (f.q) query.ilike("note", `%${f.q}%`);
    }

    const { count } = await countQuery;
    total = count ?? 0;
    const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
    // หน้าที่เกินช่วง (เช่นลบรายการจนหน้าหาย) ให้ตกมาหน้าสุดท้าย ไม่ใช่โชว์หน้าว่าง
    page = Math.min(f.page, pages);
    const start = (page - 1) * PAGE_SIZE;
    const { data } = await rowsQuery
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    rows = (data ?? []) as TransactionRow[];
  }

  const calendarQuery = {
    kind: f.kind,
    category: f.category,
    account: f.account,
    min: f.min === undefined ? undefined : String(f.min),
    max: f.max === undefined ? undefined : String(f.max),
    q: f.q,
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">{t("รายการ", "Transactions")}</h1>

      <AddTransactionCard
        categories={categories ?? []}
        accounts={accounts ?? []}
        today={scope === "day" ? anchor : today}
      />

      <TransactionFilters
        categories={categories ?? []}
        accounts={accounts ?? []}
        today={today}
      />

      {view === "calendar" ? (
        <TransactionCalendar
          scope={scope as TransactionPeriodScope}
          anchor={anchor}
          summaries={summaries}
          currency={currency}
          query={calendarQuery}
        />
      ) : (
        <>
          <TransactionList
            rows={rows}
            categories={categories ?? []}
            accounts={accounts ?? []}
            today={today}
            currency={currency}
          />

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </main>
  );
}

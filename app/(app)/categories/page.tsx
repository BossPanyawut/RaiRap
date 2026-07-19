import { CategoryManager } from "@/components/category-manager";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n-server";

export default async function CategoriesPage() {
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind, is_archived")
    .order("kind")
    .order("sort_order")
    .order("name");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16 sm:p-6">
      <h1 className="px-1 text-2xl font-semibold">{t("หมวดหมู่", "Categories")}</h1>
      <CategoryManager categories={categories ?? []} />
    </main>
  );
}

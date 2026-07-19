"use client";

import { useActionState, useState } from "react";
import {
  createCategory,
  renameCategory,
  toggleArchive,
  type CategoryState,
} from "@/app/(app)/categories/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { localizeDefaultName } from "@/lib/locale";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  is_archived: boolean;
};

function CategoryRow({ category }: { category: Category }) {
  const { locale, t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<CategoryState, FormData>(
    renameCategory,
    null,
  );

  return (
    <li>
      <GlassCard
        className={cn("flex items-center gap-3 p-4", category.is_archived && "opacity-60")}
      >
        {editing ? (
          <form action={action} className="flex flex-1 items-center gap-2">
            <input type="hidden" name="id" value={category.id} />
            <input
              name="name"
              defaultValue={category.name}
              aria-label={t("ชื่อหมวดหมู่", "Category name")}
              maxLength={40}
              className="border-glass-border flex-1 rounded-2xl border bg-input px-4 py-2 text-base sm:text-[15px]"
            />
            <Button type="submit" disabled={pending} className="px-4 py-2 text-sm">
              {t("บันทึก", "Save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm"
            >
              {t("ยกเลิก", "Cancel")}
            </Button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-[15px]">{localizeDefaultName(locale, category.name)}</span>
            {category.is_archived && (
              <span className="text-text-muted text-sm">{t("ซ่อนอยู่", "Hidden")}</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
            >
              {t("เปลี่ยนชื่อ", "Rename")}
            </button>
            <form action={toggleArchive}>
              <input type="hidden" name="id" value={category.id} />
              <input
                type="hidden"
                name="archived"
                value={String(category.is_archived)}
              />
              <button
                type="submit"
                className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
              >
                {category.is_archived ? t("เลิกซ่อน", "Unhide") : t("ซ่อน", "Hide")}
              </button>
            </form>
          </>
        )}
      </GlassCard>
      {state && "error" in state && <Alert className="mt-2">{state.error}</Alert>}
    </li>
  );
}

function AddCategory({ kind }: { kind: "income" | "expense" }) {
  const { t } = useLocale();
  const [state, action, pending] = useActionState<CategoryState, FormData>(
    createCategory,
    null,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input
        name="name"
        placeholder={kind === "expense" ? t("เพิ่มหมวดรายจ่าย", "Add expense category") : t("เพิ่มหมวดรายรับ", "Add income category")}
        aria-label={kind === "expense" ? t("ชื่อหมวดรายจ่ายใหม่", "New expense category name") : t("ชื่อหมวดรายรับใหม่", "New income category name")}
        maxLength={40}
        required
        className="border-glass-border flex-1 rounded-2xl border bg-input px-4 py-2.5 text-base sm:text-[15px]"
      />
      <Button type="submit" disabled={pending}>
        {t("เพิ่ม", "Add")}
      </Button>
      {state && "error" in state && (
        <Alert className="basis-full">{state.error}</Alert>
      )}
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const { t } = useLocale();
  return (
    <>
      {(["expense", "income"] as const).map((kind) => (
        <section key={kind} className="flex flex-col gap-3">
          <h2 className="px-1 text-xl font-semibold">
            {kind === "expense" ? t("รายจ่าย", "Expenses") : t("รายรับ", "Income")}
          </h2>
          <AddCategory kind={kind} />
          <ul className="flex flex-col gap-2">
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

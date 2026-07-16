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
import { cn } from "@/lib/cn";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  is_archived: boolean;
};

function CategoryRow({ category }: { category: Category }) {
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
              aria-label="ชื่อหมวดหมู่"
              maxLength={40}
              className="border-glass-border flex-1 rounded-2xl border bg-white/60 px-4 py-2 text-[15px]"
            />
            <Button type="submit" disabled={pending} className="px-4 py-2 text-sm">
              บันทึก
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm"
            >
              ยกเลิก
            </Button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-[15px]">{category.name}</span>
            {category.is_archived && (
              <span className="text-text-muted text-sm">ซ่อนอยู่</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
            >
              เปลี่ยนชื่อ
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
                className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-white/60"
              >
                {category.is_archived ? "เลิกซ่อน" : "ซ่อน"}
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
  const [state, action, pending] = useActionState<CategoryState, FormData>(
    createCategory,
    null,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input
        name="name"
        placeholder={kind === "expense" ? "เพิ่มหมวดรายจ่าย" : "เพิ่มหมวดรายรับ"}
        aria-label={kind === "expense" ? "ชื่อหมวดรายจ่ายใหม่" : "ชื่อหมวดรายรับใหม่"}
        maxLength={40}
        required
        className="border-glass-border flex-1 rounded-2xl border bg-white/60 px-4 py-2.5 text-[15px]"
      />
      <Button type="submit" disabled={pending}>
        เพิ่ม
      </Button>
      {state && "error" in state && (
        <Alert className="basis-full">{state.error}</Alert>
      )}
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <>
      {(["expense", "income"] as const).map((kind) => (
        <section key={kind} className="flex flex-col gap-3">
          <h2 className="px-1 text-xl font-semibold">
            {kind === "expense" ? "รายจ่าย" : "รายรับ"}
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

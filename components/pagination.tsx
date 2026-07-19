"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const pages = Math.max(Math.ceil(total / pageSize), 1);
  if (total === 0) return null;

  const go = (p: number) => {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    router.push(next.toString() ? `/transactions?${next}` : "/transactions");
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="flex items-center justify-between gap-3 px-1" aria-label={t("เปลี่ยนหน้า", "Pagination")}>
      <p className="text-text-muted text-sm">
        <span className="tabular">
          {from}–{to}
        </span>{" "}
        {t("จาก", "of")} <span className="tabular">{total}</span> {t("รายการ", "transactions")}
      </p>

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => go(page - 1)}
            className="px-4 py-2 text-sm"
          >
            {t("ก่อนหน้า", "Previous")}
          </Button>
          <span className="tabular text-text-muted text-sm whitespace-nowrap">
            {page} / {pages}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= pages}
            onClick={() => go(page + 1)}
            className="px-4 py-2 text-sm"
          >
            {t("ถัดไป", "Next")}
          </Button>
        </div>
      )}
    </nav>
  );
}

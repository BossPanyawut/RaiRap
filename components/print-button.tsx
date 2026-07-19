"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function PrintButton() {
  const { t } = useLocale();
  return (
    <Button type="button" onClick={() => window.print()}>
      {t("พิมพ์ / บันทึก PDF", "Print / Save PDF")}
    </Button>
  );
}

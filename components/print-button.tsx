"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      พิมพ์ / บันทึก PDF
    </Button>
  );
}

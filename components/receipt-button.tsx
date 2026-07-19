"use client";

import { useActionState, useState } from "react";
import {
  receiptUrl,
  removeReceipt,
  uploadReceipt,
  type ReceiptState,
} from "@/app/(app)/transactions/receipt-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function ReceiptButton({
  transactionId,
  receiptPath,
}: {
  transactionId: string;
  receiptPath: string | null;
}) {
  const { t } = useLocale();
  const [state, action, pending] = useActionState<ReceiptState, FormData>(uploadReceipt, null);
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  if (receiptPath) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={opening}
          onClick={async () => {
            setOpening(true);
            const url = await receiptUrl(receiptPath);
            setOpening(false);
            // เปิดแท็บใหม่ด้วย signed URL ที่หมดอายุใน 5 นาที
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          }}
          className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover"
        >
          {opening ? t("กำลังเปิด", "Opening") : t("ใบเสร็จ", "Receipt")}
        </button>
        <form action={removeReceipt}>
          <input type="hidden" name="id" value={transactionId} />
          <button
            type="submit"
            aria-label={t("ลบใบเสร็จของรายการนี้", "Delete this receipt")}
            className="text-text-muted rounded-full px-2 py-1.5 text-sm hover:bg-hover"
          >
            {t("ลบ", "Delete")}
          </button>
        </form>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-text-muted shrink-0 rounded-full px-3 py-1.5 text-sm hover:bg-hover"
      >
        {t("แนบใบเสร็จ", "Attach receipt")}
      </button>
    );
  }

  return (
    <form action={action} className="flex shrink-0 flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={transactionId} />
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        aria-label={t("ไฟล์ใบเสร็จ", "Receipt file")}
        required
        className="max-w-40 text-base sm:text-sm"
      />
      <Button type="submit" variant="secondary" disabled={pending} className="px-3 py-1.5 text-sm">
        {pending ? t("กำลังอัป", "Uploading") : t("อัปโหลด", "Upload")}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-text-muted rounded-full px-2 py-1.5 text-sm hover:bg-hover"
      >
        {t("ปิด", "Close")}
      </button>
      {state && "error" in state && <Alert className="basis-full">{state.error}</Alert>}
    </form>
  );
}

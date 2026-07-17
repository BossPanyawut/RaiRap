"use client";

import { useActionState, useState } from "react";
import {
  ACCOUNT_KINDS,
  createAccount,
  renameAccount,
  toggleArchiveAccount,
  type AccountState,
} from "@/app/(app)/accounts/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/cn";
import { formatMoney, type Currency } from "@/lib/money";

export type AccountRow = {
  account_id: string;
  name: string;
  kind: keyof typeof ACCOUNT_KINDS;
  is_archived: boolean;
  income: number;
  expense: number;
  balance: number;
};

const inputClass = "border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-[15px]";

function AccountCard({ row, currency }: { row: AccountRow; currency: Currency }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<AccountState, FormData>(renameAccount, null);
  const balance = Number(row.balance);

  return (
    <li>
      <GlassCard className={cn("p-5", row.is_archived && "opacity-60")}>
        {editing ? (
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="id" value={row.account_id} />
            <input name="name" defaultValue={row.name} aria-label="ชื่อบัญชี" maxLength={40} className={cn(inputClass, "flex-1")} />
            <Button type="submit" disabled={pending} className="px-4 py-2 text-sm">บันทึก</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="px-4 py-2 text-sm">ยกเลิก</Button>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px]">{row.name}</p>
                <p className="text-text-muted text-sm">
                  {ACCOUNT_KINDS[row.kind]}
                  {row.is_archived && " · ซ่อนอยู่"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => setEditing(true)} className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover">
                  เปลี่ยนชื่อ
                </button>
                <form action={toggleArchiveAccount}>
                  <input type="hidden" name="id" value={row.account_id} />
                  <input type="hidden" name="archived" value={String(row.is_archived)} />
                  <button type="submit" className="text-text-muted rounded-full px-3 py-1.5 text-sm hover:bg-hover">
                    {row.is_archived ? "เลิกซ่อน" : "ซ่อน"}
                  </button>
                </form>
              </div>
            </div>

            <p className="money mt-3 text-2xl font-semibold">
              {formatMoney(balance, currency)}
            </p>
            <p className="text-text-muted mt-1 text-sm">
              เข้า <span className="tabular">{formatMoney(Number(row.income), currency)}</span> ·
              ออก <span className="tabular">{formatMoney(Number(row.expense), currency)}</span>
            </p>
          </>
        )}
      </GlassCard>
      {state && "error" in state && <Alert className="mt-2">{state.error}</Alert>}
    </li>
  );
}

export function AccountsManager({
  rows,
  currency,
}: {
  rows: AccountRow[];
  currency: Currency;
}) {
  const [state, action, pending] = useActionState<AccountState, FormData>(createAccount, null);
  const total = rows.filter((r) => !r.is_archived).reduce((s, r) => s + Number(r.balance), 0);

  return (
    <>
      {rows.length > 0 && (
        <GlassCard className="p-5">
          <p className="text-text-muted text-[15px]">รวมทุกบัญชีที่ไม่ได้ซ่อน</p>
          <p className="money mt-1 text-3xl font-semibold">{formatMoney(total, currency)}</p>
          <p className="text-text-muted mt-2 text-sm">
            นับเฉพาะรายการที่ระบุบัญชีไว้ รายการที่ไม่ได้เลือกบัญชีไม่รวมอยู่ในนี้
          </p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <h2 className="text-xl font-semibold">เพิ่มบัญชี</h2>
        <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1.5 text-[15px] font-medium">
            ชื่อ
            <input name="name" placeholder="เช่น เงินสด" maxLength={40} required className={cn(inputClass, "font-normal")} />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            ประเภท
            <select name="kind" defaultValue="cash" className={cn(inputClass, "font-normal")}>
              {Object.entries(ACCOUNT_KINDS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={pending}>เพิ่ม</Button>
          {state && "error" in state && <Alert className="basis-full">{state.error}</Alert>}
        </form>
      </GlassCard>

      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <AccountCard key={r.account_id} row={r} currency={currency} />
        ))}
      </ul>
    </>
  );
}

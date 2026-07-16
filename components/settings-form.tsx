"use client";

import { useActionState, useState } from "react";
import {
  changeEmail,
  changePassword,
  deleteAccount,
  resetCategories,
  updateProfile,
  wipeTransactions,
  type State,
} from "@/app/(app)/settings/actions";
import { importCSV, type ImportState } from "@/app/(app)/settings/import-actions";
import { setTheme } from "@/app/(app)/theme-actions";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/cn";
import { MAX_CYCLE_DAY, MIN_CYCLE_DAY } from "@/lib/dates";
import { CURRENCIES, type Currency } from "@/lib/money";
import type { Theme } from "@/lib/theme";

const inputClass =
  "border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-[15px]";

function Result({ state }: { state: State }) {
  if (!state) return null;
  if ("error" in state) return <Alert className="mt-3">{state.error}</Alert>;
  return (
    <p role="status" className="text-text-muted mt-3 text-sm">
      {state.ok}
    </p>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="text-text-muted mt-1 text-sm">{hint}</p>}
      <div className="mt-4">{children}</div>
    </GlassCard>
  );
}

// ────────────────────────────── โปรไฟล์ ──────────────────────────────

function ProfileSection({
  displayName,
  currency,
  cycleStartDay,
}: {
  displayName: string | null;
  currency: Currency;
  cycleStartDay: number;
}) {
  const [state, action, pending] = useActionState<State, FormData>(updateProfile, null);
  const [day, setDay] = useState(cycleStartDay);
  const [cur, setCur] = useState(currency);

  return (
    <Section title="ข้อมูลผู้ใช้">
      <form action={action} className="flex flex-col gap-4">
        <Field
          id="displayName"
          name="displayName"
          label="ชื่อที่อยากให้เรียก"
          defaultValue={displayName ?? ""}
          maxLength={60}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currency" className="text-[15px] font-medium">
            สกุลเงิน
          </label>
          <select
            id="currency"
            name="currency"
            value={cur}
            onChange={(e) => setCur(e.target.value as Currency)}
            className={inputClass}
          >
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>
                {c.symbol} {c.label} ({code})
              </option>
            ))}
          </select>
          {cur !== currency && (
            <p className="text-text-muted text-sm">
              เปลี่ยนสกุลเงินไม่แปลงยอดที่บันทึกไว้ ตัวเลขเดิมจะแสดงด้วยสัญลักษณ์ใหม่
              {CURRENCIES[cur].decimals === 0 && " และจะไม่แสดงทศนิยม"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cycleStartDay" className="text-[15px] font-medium">
            วันเริ่มรอบเดือน
          </label>
          <select
            id="cycleStartDay"
            name="cycleStartDay"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: MAX_CYCLE_DAY - MIN_CYCLE_DAY + 1 }, (_, i) => i + MIN_CYCLE_DAY).map(
              (d) => (
                <option key={d} value={d}>
                  {d === 1 ? "วันที่ 1 (ตรงกับเดือนปฏิทิน)" : `วันที่ ${d}`}
                </option>
              ),
            )}
          </select>
          <p className="text-text-muted text-sm">
            {day === 1
              ? "รอบงบตรงกับเดือนปฏิทิน"
              : `รอบงบจะเริ่มวันที่ ${day} ของทุกเดือน ถึงวันที่ ${day - 1} ของเดือนถัดไป เหมาะกับคนที่รับเงินเดือนกลางเดือน`}
          </p>
          {day !== cycleStartDay && (
            <p className="text-text-muted text-sm">
              รายการเดิมจะถูกจัดเข้ารอบใหม่ตามวันที่ที่บันทึกไว้ ไม่มีข้อมูลหาย
              แต่ยอดรวมแต่ละรอบจะเปลี่ยน
            </p>
          )}
          {day > 28 && (
            <p className="text-text-muted text-sm">
              เลือกได้ถึงวันที่ 28 เท่านั้น เพราะทุกเดือนมีวันที่ 28 เสมอ
            </p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "กำลังบันทึก" : "บันทึก"}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

// ────────────────────────────── ธีม ──────────────────────────────

function ThemeSection({ theme }: { theme: Theme }) {
  return (
    <Section title="ธีม" hint="เลือกโหมดสว่างหรือมืด">
      <form action={setTheme} className="flex gap-2">
        {(["light", "dark"] as const).map((t) => (
          <button
            key={t}
            type="submit"
            name="theme"
            value={t}
            aria-pressed={theme === t}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-[15px] transition-colors duration-400 ease-in-out",
              theme === t
                ? "bg-accent-primary-strong text-white"
                : "border-glass-border text-text-muted border bg-input hover:bg-hover",
            )}
          >
            {t === "light" ? "สว่าง" : "มืด"}
          </button>
        ))}
      </form>
    </Section>
  );
}

// ────────────────────────────── ความปลอดภัย ──────────────────────────────

function PasswordSection() {
  const [state, action, pending] = useActionState<State, FormData>(changePassword, null);
  return (
    <Section title="เปลี่ยนรหัสผ่าน">
      <form action={action} className="flex flex-col gap-4">
        <Field
          id="current"
          name="current"
          type="password"
          label="รหัสผ่านปัจจุบัน"
          autoComplete="current-password"
          required
        />
        <Field
          id="next"
          name="next"
          type="password"
          label="รหัสผ่านใหม่"
          autoComplete="new-password"
          hint="อย่างน้อย 8 ตัว"
          required
        />
        <Field
          id="confirm"
          name="confirm"
          type="password"
          label="รหัสผ่านใหม่อีกครั้ง"
          autoComplete="new-password"
          required
        />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "กำลังเปลี่ยน" : "เปลี่ยนรหัสผ่าน"}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

function EmailSection({ email }: { email: string }) {
  const [state, action, pending] = useActionState<State, FormData>(changeEmail, null);
  return (
    <Section title="เปลี่ยนอีเมล" hint={`ตอนนี้ใช้ ${email}`}>
      <form action={action} className="flex flex-col gap-4">
        <Field id="email" name="email" type="email" label="อีเมลใหม่" autoComplete="email" required />
        <Field
          id="email-current"
          name="current"
          type="password"
          label="รหัสผ่าน"
          autoComplete="current-password"
          required
        />
        <p className="text-text-muted text-sm">
          ต้องกดยืนยันลิงก์ทั้งในอีเมลเก่าและอีเมลใหม่ อีเมลถึงจะเปลี่ยนจริง
        </p>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "กำลังส่งลิงก์" : "ส่งลิงก์ยืนยัน"}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

// ────────────────────────────── ข้อมูล ──────────────────────────────

function DataSection() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCSV, null);
  const [resetState, setResetState] = useState<State>(null);
  const [resetting, setResetting] = useState(false);

  return (
    <Section
      title="ข้อมูล"
      hint="ส่งออกเก็บไว้ก่อนล้างข้อมูลเสมอ ไฟล์ที่ส่งออกนำเข้ากลับได้"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-[15px] font-medium">ส่งออก</h3>
          <p className="text-text-muted mt-1 text-sm">
            ไฟล์ CSV เปิดด้วย Excel ได้ มีทุกรายการที่บันทึกไว้
          </p>
          <ButtonLink href="/settings/export" variant="secondary" prefetch={false} className="mt-3">
            ดาวน์โหลด CSV
          </ButtonLink>
        </div>

        <div className="border-glass-border border-t pt-6">
          <h3 className="text-[15px] font-medium">นำเข้า</h3>
          <p className="text-text-muted mt-1 text-sm">
            คอลัมน์: วันที่ (ปปปป-ดด-วว), ประเภท (รายรับ/รายจ่าย), หมวดหมู่, จำนวนเงิน, บันทึกย่อ
            หมวดที่ยังไม่มีจะถูกสร้างให้
          </p>
          <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              aria-label="ไฟล์ CSV ที่จะนำเข้า"
              required
              className="text-[15px]"
            />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "กำลังนำเข้า" : "นำเข้า"}
            </Button>
          </form>
          {state && "error" in state && <Alert className="mt-3">{state.error}</Alert>}
          {state && "ok" in state && (
            <div className="mt-3">
              <p role="status" className="text-text-muted text-sm">
                {state.ok}
              </p>
              {state.skipped.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">
                    ข้าม {state.skipped.length} แถว ดูว่าแถวไหน
                  </summary>
                  <ul className="text-text-muted mt-2 flex flex-col gap-1 text-sm">
                    {state.skipped.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="border-glass-border border-t pt-6">
          <h3 className="text-[15px] font-medium">หมวดหมู่เริ่มต้น</h3>
          <p className="text-text-muted mt-1 text-sm">
            เพิ่มหมวดเริ่มต้นที่ขาดกลับมา และเลิกซ่อนหมวดที่ซ่อนไว้ ไม่ลบหมวดที่คุณสร้างเอง
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={resetting}
            className="mt-3"
            onClick={async () => {
              setResetting(true);
              setResetState(await resetCategories());
              setResetting(false);
            }}
          >
            {resetting ? "กำลังรีเซ็ต" : "รีเซ็ตหมวดหมู่"}
          </Button>
          <Result state={resetState} />
        </div>
      </div>
    </Section>
  );
}

// ────────────────────────────── ล้างข้อมูล ──────────────────────────────

function WipeSection({ counts }: { counts: { all: number; period: number } }) {
  const [state, action, pending] = useActionState<State, FormData>(wipeTransactions, null);
  const [scope, setScope] = useState<"all" | "period" | "range">("period");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirm, setConfirm] = useState("");

  // "ช่วงที่เลือก" นับไม่ได้จนกว่าจะรู้วันที่ ปุ่มจึงยังกดไม่ได้
  const expected = scope === "all" ? counts.all : scope === "period" ? counts.period : null;
  const ready =
    expected !== null && expected > 0 && confirm.trim() === String(expected);

  return (
    <Section
      title="ล้างรายการ"
      hint="ลบแล้วกู้กลับไม่ได้ ส่งออก CSV เก็บไว้ก่อนถ้ายังไม่ได้ทำ"
    >
      <form action={action} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-medium">ลบแค่ไหน</legend>
          {(
            [
              ["period", `เฉพาะรอบนี้ (${counts.period} รายการ)`],
              ["all", `ทั้งหมด (${counts.all} รายการ)`],
              ["range", "เลือกช่วงวันที่เอง"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex items-center gap-2 text-[15px]">
              <input
                type="radio"
                name="scope"
                value={v}
                checked={scope === v}
                onChange={() => {
                  setScope(v);
                  setConfirm("");
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>

        {scope === "range" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[15px] font-medium">
              ตั้งแต่
              <input
                type="date"
                name="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
                className={cn(inputClass, "font-normal")}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[15px] font-medium">
              ถึง
              <input
                type="date"
                name="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className={cn(inputClass, "font-normal")}
              />
            </label>
          </div>
        )}

        {scope !== "range" && (
          <>
            <input type="hidden" name="from" value="" />
            <input type="hidden" name="to" value="" />
          </>
        )}

        <input type="hidden" name="expected" value={expected ?? 0} />

        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" name="alsoBudgets" />
          ลบงบที่ตั้งไว้ในช่วงเดียวกันด้วย
        </label>

        {scope === "range" ? (
          <p className="text-text-muted text-sm">
            เลือกช่วงวันที่แล้วกดลบ ระบบจะบอกจำนวนรายการก่อนลบจริง
          </p>
        ) : (
          <Field
            id="confirm"
            name="confirm"
            label={`พิมพ์ ${expected} เพื่อยืนยัน`}
            hint={`จะลบ ${expected} รายการ กู้กลับไม่ได้`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
          />
        )}

        {scope === "range" && <input type="hidden" name="confirm" value={confirm} />}

        <Button
          type="submit"
          disabled={pending || (scope !== "range" && !ready)}
          className="self-start"
        >
          {pending ? "กำลังลบ" : "ลบรายการ"}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

// ────────────────────────────── ลบบัญชี ──────────────────────────────

function DeleteAccountSection({ email }: { email: string }) {
  const [state, action, pending] = useActionState<State, FormData>(deleteAccount, null);
  const [confirm, setConfirm] = useState("");

  return (
    <Section
      title="ลบบัญชี"
      hint="ลบบัญชี รายการ งบ และหมวดหมู่ทั้งหมดถาวร กู้กลับไม่ได้"
    >
      <form action={action} className="flex flex-col gap-4">
        <Field
          id="delete-current"
          name="current"
          type="password"
          label="รหัสผ่าน"
          autoComplete="current-password"
          required
        />
        <Field
          id="delete-confirm"
          name="confirm"
          label="พิมพ์อีเมลของคุณเพื่อยืนยัน"
          hint={email}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" disabled={pending || confirm.trim() !== email} className="self-start">
          {pending ? "กำลังลบบัญชี" : "ลบบัญชีถาวร"}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

export function SettingsForm({
  email,
  displayName,
  currency,
  cycleStartDay,
  theme,
  counts,
}: {
  email: string;
  displayName: string | null;
  currency: Currency;
  cycleStartDay: number;
  theme: Theme;
  counts: { all: number; period: number };
}) {
  return (
    <>
      <ProfileSection displayName={displayName} currency={currency} cycleStartDay={cycleStartDay} />
      <ThemeSection theme={theme} />
      <DataSection />
      <PasswordSection />
      <EmailSection email={email} />
      <WipeSection counts={counts} />
      <DeleteAccountSection email={email} />
    </>
  );
}

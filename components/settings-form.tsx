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
import { PreferenceSettings } from "@/components/preference-settings";
import { useLocale } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/cn";
import { MAX_CYCLE_DAY, MIN_CYCLE_DAY } from "@/lib/dates";
import { localizeSystemMessage, type Locale } from "@/lib/locale";
import { CURRENCIES, type Currency } from "@/lib/money";
import type { Theme } from "@/lib/theme";

const inputClass =
  "border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-base sm:text-[15px]";

function Result({ state }: { state: State }) {
  const { locale } = useLocale();
  if (!state) return null;
  if ("error" in state) return <Alert className="mt-3">{state.error}</Alert>;
  return (
    <p role="status" className="text-text-muted mt-3 text-sm">
      {localizeSystemMessage(locale, state.ok)}
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
  const { locale, t } = useLocale();
  const [state, action, pending] = useActionState<State, FormData>(updateProfile, null);
  const [day, setDay] = useState(cycleStartDay);
  const [cur, setCur] = useState(currency);

  return (
    <Section title={t("ข้อมูลผู้ใช้", "User details")}>
      <form action={action} className="flex flex-col gap-4">
        <Field
          id="displayName"
          name="displayName"
          label={t("ชื่อที่อยากให้เรียก", "Display name")}
          defaultValue={displayName ?? ""}
          maxLength={60}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currency" className="text-[15px] font-medium">
            {t("สกุลเงิน", "Currency")}
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
                {c.symbol} {locale === "en" ? ({ THB: "Thai baht", USD: "US dollar", EUR: "Euro", GBP: "British pound", JPY: "Japanese yen" } as const)[code as Currency] : c.label} ({code})
              </option>
            ))}
          </select>
          {cur !== currency && (
            <p className="text-text-muted text-sm">
              {t("เปลี่ยนสกุลเงินไม่แปลงยอดที่บันทึกไว้ ตัวเลขเดิมจะแสดงด้วยสัญลักษณ์ใหม่", "Changing currency does not convert saved amounts; existing numbers use the new symbol.")}
              {CURRENCIES[cur].decimals === 0 && ` ${t("และจะไม่แสดงทศนิยม", "Decimals will not be shown.")}`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cycleStartDay" className="text-[15px] font-medium">
            {t("วันเริ่มรอบเดือน", "Cycle start day")}
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
                  {d === 1 ? t("วันที่ 1 (ตรงกับเดือนปฏิทิน)", "Day 1 (calendar month)") : `${t("วันที่", "Day")} ${d}`}
                </option>
              ),
            )}
          </select>
          <p className="text-text-muted text-sm">
            {day === 1
              ? t("รอบงบตรงกับเดือนปฏิทิน", "Your budget cycle matches the calendar month.")
              : locale === "th" ? `รอบงบจะเริ่มวันที่ ${day} ของทุกเดือน ถึงวันที่ ${day - 1} ของเดือนถัดไป เหมาะกับคนที่รับเงินเดือนกลางเดือน` : `The cycle runs from day ${day} to day ${day - 1} of the following month.`}
          </p>
          {day !== cycleStartDay && (
            <p className="text-text-muted text-sm">
              {t("รายการเดิมจะถูกจัดเข้ารอบใหม่ตามวันที่ที่บันทึกไว้ ไม่มีข้อมูลหาย แต่ยอดรวมแต่ละรอบจะเปลี่ยน", "Existing transactions will be regrouped by their saved dates. No data is lost, but cycle totals will change.")}
            </p>
          )}
          {day > 28 && (
            <p className="text-text-muted text-sm">
              {t("เลือกได้ถึงวันที่ 28 เท่านั้น เพราะทุกเดือนมีวันที่ 28 เสมอ", "The latest supported start day is 28, which exists in every month.")}
            </p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? t("กำลังบันทึก", "Saving") : t("บันทึก", "Save")}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

// ────────────────────────────── ความปลอดภัย ──────────────────────────────

function PasswordSection() {
  const { t } = useLocale();
  const [state, action, pending] = useActionState<State, FormData>(changePassword, null);
  return (
    <Section title={t("เปลี่ยนรหัสผ่าน", "Change password")}>
      <form action={action} className="flex flex-col gap-4">
        <Field
          id="current"
          name="current"
          type="password"
          label={t("รหัสผ่านปัจจุบัน", "Current password")}
          autoComplete="current-password"
          required
        />
        <Field
          id="next"
          name="next"
          type="password"
          label={t("รหัสผ่านใหม่", "New password")}
          autoComplete="new-password"
          hint={t("อย่างน้อย 8 ตัว", "At least 8 characters")}
          required
        />
        <Field
          id="confirm"
          name="confirm"
          type="password"
          label={t("รหัสผ่านใหม่อีกครั้ง", "Confirm new password")}
          autoComplete="new-password"
          required
        />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? t("กำลังเปลี่ยน", "Changing") : t("เปลี่ยนรหัสผ่าน", "Change password")}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

function EmailSection({ email }: { email: string }) {
  const { t } = useLocale();
  const [state, action, pending] = useActionState<State, FormData>(changeEmail, null);
  return (
    <Section title={t("เปลี่ยนอีเมล", "Change email")} hint={`${t("ตอนนี้ใช้", "Current email:")} ${email}`}>
      <form action={action} className="flex flex-col gap-4">
        <Field id="email" name="email" type="email" label={t("อีเมลใหม่", "New email")} autoComplete="email" required />
        <Field
          id="email-current"
          name="current"
          type="password"
          label={t("รหัสผ่าน", "Password")}
          autoComplete="current-password"
          required
        />
        <p className="text-text-muted text-sm">
          {t("ต้องกดยืนยันลิงก์ทั้งในอีเมลเก่าและอีเมลใหม่ อีเมลถึงจะเปลี่ยนจริง", "Confirm the links sent to both the old and new email addresses to complete the change.")}
        </p>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? t("กำลังส่งลิงก์", "Sending") : t("ส่งลิงก์ยืนยัน", "Send confirmation links")}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

// ────────────────────────────── ข้อมูล ──────────────────────────────

function DataSection() {
  const { locale, t } = useLocale();
  const [state, action, pending] = useActionState<ImportState, FormData>(importCSV, null);
  const [resetState, setResetState] = useState<State>(null);
  const [resetting, setResetting] = useState(false);

  return (
    <Section
      title={t("ข้อมูล", "Data")}
      hint={t("ส่งออกเก็บไว้ก่อนล้างข้อมูลเสมอ ไฟล์ที่ส่งออกนำเข้ากลับได้", "Export a backup before clearing data. Exported files can be imported again.")}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-[15px] font-medium">{t("ส่งออก", "Export")}</h3>
          <p className="text-text-muted mt-1 text-sm">
            {t("ไฟล์ CSV เปิดด้วย Excel ได้ มีทุกรายการที่บันทึกไว้", "The CSV contains every saved transaction and opens in Excel.")}
          </p>
          <ButtonLink href="/settings/export" variant="secondary" prefetch={false} className="mt-3">
            {t("ดาวน์โหลด CSV", "Download CSV")}
          </ButtonLink>
        </div>

        <div className="border-glass-border border-t pt-6">
          <h3 className="text-[15px] font-medium">{t("นำเข้า", "Import")}</h3>
          <p className="text-text-muted mt-1 text-sm">
            {t("คอลัมน์: วันที่ (ปปปป-ดด-วว), ประเภท (รายรับ/รายจ่าย), หมวดหมู่, จำนวนเงิน, บันทึกย่อ หมวดที่ยังไม่มีจะถูกสร้างให้", "Columns: Date (YYYY-MM-DD), Type (Income/Expense), Category, Amount, Note. Missing categories are created automatically.")}
          </p>
          <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              aria-label={t("ไฟล์ CSV ที่จะนำเข้า", "CSV file to import")}
              required
              className="min-w-0 max-w-full text-base sm:text-[15px]"
            />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? t("กำลังนำเข้า", "Importing") : t("นำเข้า", "Import")}
            </Button>
          </form>
          {state && "error" in state && <Alert className="mt-3">{state.error}</Alert>}
          {state && "ok" in state && (
            <div className="mt-3">
              <p role="status" className="text-text-muted text-sm">
                {localizeSystemMessage(locale, state.ok)}
              </p>
              {state.skipped.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">
                    {t("ข้าม", "Skipped")} {state.skipped.length} {t("แถว ดูว่าแถวไหน", "rows — view details")}
                  </summary>
                  <ul className="text-text-muted mt-2 flex flex-col gap-1 text-sm">
                    {state.skipped.map((s, i) => (
                      <li key={i}>{localizeSystemMessage(locale, s)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="border-glass-border border-t pt-6">
          <h3 className="text-[15px] font-medium">{t("หมวดหมู่เริ่มต้น", "Default categories")}</h3>
          <p className="text-text-muted mt-1 text-sm">
            {t("เพิ่มหมวดเริ่มต้นที่ขาดกลับมา และเลิกซ่อนหมวดที่ซ่อนไว้ ไม่ลบหมวดที่คุณสร้างเอง", "Restore missing default categories and unhide archived ones without deleting custom categories.")}
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
            {resetting ? t("กำลังรีเซ็ต", "Resetting") : t("รีเซ็ตหมวดหมู่", "Reset categories")}
          </Button>
          <Result state={resetState} />
        </div>
      </div>
    </Section>
  );
}

// ────────────────────────────── ล้างข้อมูล ──────────────────────────────

function WipeSection({ counts }: { counts: { all: number; period: number } }) {
  const { locale, t } = useLocale();
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
      title={t("ล้างรายการ", "Clear transactions")}
      hint={t("ลบแล้วกู้กลับไม่ได้ ส่งออก CSV เก็บไว้ก่อนถ้ายังไม่ได้ทำ", "Deleted data cannot be recovered. Export a CSV backup first.")}
    >
      <form action={action} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-medium">{t("ลบแค่ไหน", "What to delete")}</legend>
          {(
            [
              ["period", locale === "th" ? `เฉพาะรอบนี้ (${counts.period} รายการ)` : `This cycle (${counts.period} transactions)`],
              ["all", locale === "th" ? `ทั้งหมด (${counts.all} รายการ)` : `All (${counts.all} transactions)`],
              ["range", t("เลือกช่วงวันที่เอง", "Choose a date range")],
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
              {t("ตั้งแต่", "From")}
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
              {t("ถึง", "To")}
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
          {t("ลบงบที่ตั้งไว้ในช่วงเดียวกันด้วย", "Also delete budgets in the same period")}
        </label>

        {scope === "range" ? (
          <p className="text-text-muted text-sm">
            {t("เลือกช่วงวันที่แล้วกดลบ ระบบจะบอกจำนวนรายการก่อนลบจริง", "Choose a date range and continue to preview the number of transactions before deletion.")}
          </p>
        ) : (
          <Field
            id="confirm"
            name="confirm"
            label={locale === "th" ? `พิมพ์ ${expected} เพื่อยืนยัน` : `Type ${expected} to confirm`}
            hint={locale === "th" ? `จะลบ ${expected} รายการ กู้กลับไม่ได้` : `${expected} transactions will be permanently deleted`}
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
          {pending ? t("กำลังลบ", "Deleting") : t("ลบรายการ", "Delete transactions")}
        </Button>
      </form>
      <Result state={state} />
    </Section>
  );
}

// ────────────────────────────── ลบบัญชี ──────────────────────────────

function DeleteAccountSection({ email }: { email: string }) {
  const { t } = useLocale();
  const [state, action, pending] = useActionState<State, FormData>(deleteAccount, null);
  const [confirm, setConfirm] = useState("");

  return (
    <Section
      title={t("ลบบัญชี", "Delete account")}
      hint={t("ลบบัญชี รายการ งบ และหมวดหมู่ทั้งหมดถาวร กู้กลับไม่ได้", "Permanently delete your account, transactions, budgets, and categories.")}
    >
      <form action={action} className="flex flex-col gap-4">
        <Field
          id="delete-current"
          name="current"
          type="password"
          label={t("รหัสผ่าน", "Password")}
          autoComplete="current-password"
          required
        />
        <Field
          id="delete-confirm"
          name="confirm"
          label={t("พิมพ์อีเมลของคุณเพื่อยืนยัน", "Type your email to confirm")}
          hint={email}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" disabled={pending || confirm.trim() !== email} className="self-start">
          {pending ? t("กำลังลบบัญชี", "Deleting account") : t("ลบบัญชีถาวร", "Delete account permanently")}
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
  locale,
  counts,
}: {
  email: string;
  displayName: string | null;
  currency: Currency;
  cycleStartDay: number;
  theme: Theme;
  locale: Locale;
  counts: { all: number; period: number };
}) {
  return (
    <>
      <ProfileSection displayName={displayName} currency={currency} cycleStartDay={cycleStartDay} />
      <PreferenceSettings theme={theme} locale={locale} />
      <DataSection />
      <PasswordSection />
      <EmailSection email={email} />
      <WipeSection counts={counts} />
      <DeleteAccountSection email={email} />
    </>
  );
}

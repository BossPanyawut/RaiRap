import type { Metadata } from "next";
import { GlassCard } from "@/components/ui/glass-card";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n-server";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "en"
    ? {
        title: "RaiRap — Know what you have left this month",
        description:
          "Track income and expenses, set category budgets, and get a warning before the money runs out.",
      }
    : {
        title: "RaiRap — รู้ว่าเดือนนี้เหลือเท่าไหร่",
        description:
          "บันทึกรายรับ-รายจ่าย ตั้งงบรายหมวด แล้วให้ระบบเตือนก่อนเงินหมด",
      };
}

export default async function WelcomePage() {
  const { t } = await getI18n();

  const features: Array<[string, string]> = [
    [
      t("งบรายหมวดที่เตือนก่อนเกิน", "Budgets that warn before you overspend"),
      t(
        "ตั้งวงเงินต่อหมวดต่อรอบเดือน ระบบเตือนตั้งแต่ใช้ถึง 80% ไม่ใช่หลังเงินหมดแล้ว",
        "Set a limit per category per cycle. Alerts start at 80% of the limit, not after the money is gone.",
      ),
    ],
    [
      t("เห็นปลายเดือนก่อนถึงปลายเดือน", "See the end of the month early"),
      t(
        "กราฟแนวโน้มยอดคงเหลือ และพยากรณ์จากจังหวะการใช้จ่ายจริงของคุณ",
        "A balance trend chart plus a forecast built from your actual spending pace.",
      ),
    ],
    [
      t("ข้อมูลเป็นของคุณ", "Your data stays yours"),
      t(
        "ส่งออก CSV ได้ตลอด สรุปรอบเดือนเป็น PDF และลบบัญชีเมื่อไหร่ก็ได้ ข้อมูลหายทันที",
        "Export CSV anytime, save a monthly report as PDF, and delete your account whenever you want — the data goes with it.",
      ),
    ],
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-4 pb-16 sm:gap-14 sm:p-6">
      <section className="grid items-center gap-8 pt-6 sm:grid-cols-2 sm:pt-10">
        <div>
          <h1 className="text-3xl leading-snug font-semibold sm:text-4xl">
            {t(
              "รู้ว่าเดือนนี้เหลือเท่าไหร่ และกำลังจะเหลือเท่าไหร่",
              "Know what you have left this month — and where it is heading",
            )}
          </h1>
          <p className="text-text-muted mt-4 text-[15px] sm:text-base">
            {t(
              "บันทึกรายรับ-รายจ่ายในไม่กี่วินาที ตั้งงบรายหมวด แล้วให้ RaiRap เตือนก่อนเงินหมด",
              "Log income and expenses in seconds, set category budgets, and let RaiRap warn you before the money runs out.",
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/signup">{t("สมัครใช้งาน", "Create account")}</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              {t("เข้าสู่ระบบ", "Sign in")}
            </ButtonLink>
          </div>
          <p className="text-text-muted mt-4 text-sm">
            {t("ใช้ฟรี ไม่มีโฆษณา ไม่ขายข้อมูล", "Free to use. No ads. Your data is never sold.")}
          </p>
        </div>

        {/* ตัวอย่างการ์ดยอดคงเหลือของจริง — โชว์ตัวแอปแทน screenshot */}
        <GlassCard className="hero-card p-8">
          <p className="text-text-muted text-[15px]">
            {t("ยอดคงเหลือ กรกฎาคม", "Balance, July")}
            <span className="text-text-muted"> · {t("ตัวอย่าง", "Example")}</span>
          </p>
          <p className="money mt-2 text-5xl leading-tight font-semibold">฿ 12,450</p>
          <p className="text-text-muted mt-3 text-[15px]">
            {t("รายรับ", "Income")} <span className="tabular">฿ 25,000</span> ·{" "}
            {t("รายจ่าย", "Expenses")} <span className="tabular">฿ 12,550</span>
          </p>
          <p className="text-text-muted mt-1 text-sm">
            {t("สิ้นเดือนคาดว่าจะเหลือ", "Projected to end the month at")}{" "}
            <span className="tabular">฿ 8,900</span>
          </p>
        </GlassCard>
      </section>

      <section aria-label={t("ความสามารถหลัก", "Key features")} className="grid gap-4 sm:grid-cols-3">
        {features.map(([title, body]) => (
          <GlassCard key={title} className="p-6">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-text-muted mt-2 text-[15px]">{body}</p>
          </GlassCard>
        ))}
      </section>

      <p className="text-text-muted text-center text-sm">
        {t(
          "หลายกระเป๋าเงิน · รายการเกิดซ้ำ · แนบใบเสร็จ · เป้าหมายเงินเก็บ · โหมดมืด · ไทย / English",
          "Multiple wallets · Recurring transactions · Receipt attachments · Saving goals · Dark mode · ไทย / English",
        )}
      </p>

      <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="text-2xl font-semibold">
          {t("เริ่มบันทึกรายการแรกของเดือนนี้", "Start with this month's first transaction")}
        </h2>
        <p className="text-text-muted max-w-xl text-[15px]">
          {t(
            "สมัครด้วยอีเมล ได้หมวดหมู่เริ่มต้นครบ พร้อมบันทึกทันที",
            "Sign up with your email and start right away with a ready-made set of categories.",
          )}
        </p>
        <ButtonLink href="/signup">{t("สมัครใช้งาน", "Create account")}</ButtonLink>
      </GlassCard>
    </main>
  );
}

import type { Metadata } from "next";
import { GlassCard } from "@/components/ui/glass-card";
import { getI18n } from "@/lib/i18n-server";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "en"
        ? "Terms of service — RaiRap"
        : "เงื่อนไขการใช้งาน — RaiRap",
  };
}

export default async function TermsPage() {
  const { t } = await getI18n();

  const sections: Array<[string, string]> = [
    [
      t("บริการนี้คืออะไร", "What this service is"),
      t(
        "RaiRap เป็นเครื่องมือบันทึกรายรับ-รายจ่ายส่วนตัว ตัวเลขทั้งหมดมาจากสิ่งที่คุณบันทึกเอง ระบบสรุปและพยากรณ์จากข้อมูลนั้น ไม่ใช่คำแนะนำทางการเงินหรือการลงทุน",
        "RaiRap is a personal income and expense tracker. Every number comes from what you record yourself; the summaries and forecasts are derived from that data and are not financial or investment advice.",
      ),
    ],
    [
      t("บัญชีของคุณ", "Your account"),
      t(
        "หนึ่งบัญชีต่อหนึ่งอีเมล คุณเป็นผู้ดูแลรหัสผ่านของตัวเอง กิจกรรมที่เกิดขึ้นผ่านบัญชีถือว่าทำโดยคุณ ถ้าพบการใช้งานผิดปกติให้เปลี่ยนรหัสผ่านทันทีในหน้าตั้งค่า",
        "One account per email address. You are responsible for your password, and activity on the account is treated as yours. If you notice anything unusual, change your password immediately in Settings.",
      ),
    ],
    [
      t("ค่าบริการ", "Fees"),
      t(
        "ตอนนี้ใช้ฟรีทั้งหมด ถ้าในอนาคตมีส่วนที่เก็บค่าบริการ จะแจ้งล่วงหน้าอย่างชัดเจน และส่วนที่คุณใช้อยู่จะไม่ถูกเรียกเก็บย้อนหลัง",
        "The service is currently free. If paid features are introduced, they will be announced clearly in advance, and nothing you already use will be charged retroactively.",
      ),
    ],
    [
      t("ข้อมูลของคุณ", "Your data"),
      t(
        "ข้อมูลที่บันทึกเป็นของคุณ ส่งออกเป็น CSV ได้ตลอดเวลา และลบบัญชีได้เองในหน้าตั้งค่า — ลบแล้วข้อมูลทั้งหมดถูกลบทันที รายละเอียดอยู่ในนโยบายความเป็นส่วนตัว",
        "The data you record belongs to you. Export it as CSV at any time, or delete your account in Settings — deletion removes all of your data immediately. See the privacy policy for details.",
      ),
    ],
    [
      t("ขอบเขตความรับผิด", "Limitation of liability"),
      t(
        "บริการให้ตามสภาพที่เป็น (as is) เราตั้งใจให้ตัวเลขถูกต้องและระบบพร้อมใช้ แต่ไม่รับประกันว่าจะไม่มีข้อผิดพลาดหรือหยุดชะงัก การตัดสินใจทางการเงินจากข้อมูลในระบบเป็นความรับผิดชอบของคุณ",
        "The service is provided as is. We work to keep the numbers correct and the system available, but do not guarantee it will be error-free or uninterrupted. Financial decisions based on the data are your responsibility.",
      ),
    ],
    [
      t("การเปลี่ยนแปลงเงื่อนไข", "Changes to these terms"),
      t(
        "ถ้าเงื่อนไขเปลี่ยนในสาระสำคัญ จะแจ้งในแอปก่อนมีผล การใช้งานต่อหลังวันที่มีผลถือว่ายอมรับเงื่อนไขใหม่",
        "If these terms change in a meaningful way, the change will be announced in the app before it takes effect. Continuing to use the service after that date means you accept the new terms.",
      ),
    ],
    [
      t("การยุติบริการ", "Termination"),
      t(
        "คุณหยุดใช้และลบบัญชีได้ทุกเมื่อ เราอาจระงับบัญชีที่ใช้งานผิดวัตถุประสงค์ เช่น พยายามเข้าถึงข้อมูลของผู้อื่นหรือโจมตีระบบ",
        "You can stop using the service and delete your account at any time. We may suspend accounts that abuse the service, such as attempting to access other users' data or attacking the system.",
      ),
    ],
    [
      t("ติดต่อ", "Contact"),
      t(
        "แจ้งปัญหาหรือคำถามได้ที่ GitHub repository ของโปรเจกต์ (BossPanyawut/RaiRap)",
        "Report problems or questions via the project's GitHub repository (BossPanyawut/RaiRap).",
      ),
    ],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-16 sm:p-6">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">
          {t("เงื่อนไขการใช้งาน", "Terms of service")}
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          {t("ปรับปรุงล่าสุด 19 กรกฎาคม 2569", "Last updated July 19, 2026")}
        </p>

        {sections.map(([title, body]) => (
          <section key={title} className="mt-6">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-text-muted mt-1 text-[15px]">{body}</p>
          </section>
        ))}
      </GlassCard>
    </main>
  );
}

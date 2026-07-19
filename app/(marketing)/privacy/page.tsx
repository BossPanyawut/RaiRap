import type { Metadata } from "next";
import { GlassCard } from "@/components/ui/glass-card";
import { getI18n } from "@/lib/i18n-server";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "en"
        ? "Privacy policy — RaiRap"
        : "นโยบายความเป็นส่วนตัว — RaiRap",
  };
}

export default async function PrivacyPage() {
  const { t } = await getI18n();

  const sections: Array<[string, string]> = [
    [
      t("ข้อมูลที่เก็บ", "What we collect"),
      t(
        "อีเมลและรหัสผ่าน (เก็บแบบแฮช) ชื่อที่อยากให้เรียก รายการรายรับ-รายจ่ายที่คุณบันทึกเอง งบ เป้าหมาย บัญชี/กระเป๋าเงิน ใบเสร็จที่คุณแนบ และการตั้งค่าการแสดงผล (ธีม ภาษา สกุลเงิน รอบเดือน) — ไม่มีการเก็บข้อมูลอื่นนอกจากที่คุณกรอกเข้ามา",
        "Your email and password (stored hashed), your display name, the income and expense records you enter, budgets, goals, accounts and wallets, receipts you attach, and display preferences (theme, language, currency, billing cycle). Nothing is collected beyond what you enter.",
      ),
    ],
    [
      t("ใช้ทำอะไร", "How it is used"),
      t(
        "ใช้เพื่อให้บริการเท่านั้น: แสดงยอด สรุป และพยากรณ์ของคุณเอง ไม่ขายข้อมูล ไม่แชร์ให้บุคคลที่สาม ไม่มีโฆษณา และไม่มีสคริปต์ติดตามพฤติกรรม (analytics tracker) ในแอป",
        "Only to provide the service: showing your own balances, summaries, and forecasts. Your data is never sold or shared with third parties. There are no ads and no behavioral analytics trackers in the app.",
      ),
    ],
    [
      t("เก็บที่ไหน", "Where it is stored"),
      t(
        "ข้อมูลอยู่บน Supabase (ศูนย์ข้อมูลสิงคโปร์) และตัวเว็บทำงานบน Vercel ข้อมูลแยกรายบัญชีที่ชั้นฐานข้อมูลด้วย Row Level Security — บัญชีอื่นมองข้อมูลของคุณไม่เห็นแม้ในทางเทคนิค ใบเสร็จอยู่ในพื้นที่ส่วนตัวที่ต้องล็อกอินเป็นเจ้าของเท่านั้นถึงเปิดได้",
        "Data lives in Supabase (Singapore region) and the web app runs on Vercel. Data is isolated per account at the database layer with Row Level Security — other accounts technically cannot see your data. Receipts are stored in a private bucket only the signed-in owner can open.",
      ),
    ],
    [
      t("คุกกี้", "Cookies"),
      t(
        "ใช้คุกกี้สามอย่าง: เซสชันล็อกอิน ธีม และภาษา ทั้งหมดจำเป็นต่อการทำงานของแอป ไม่มีคุกกี้ติดตามหรือคุกกี้โฆษณา",
        "Three cookies are used: your sign-in session, theme, and language. All are required for the app to work. There are no tracking or advertising cookies.",
      ),
    ],
    [
      t("อีเมลจากระบบ", "Email from the system"),
      t(
        "ระบบส่งอีเมลเฉพาะเรื่องบัญชีของคุณ เช่น ยืนยันอีเมล เปลี่ยนอีเมล หรือรีเซ็ตรหัสผ่าน ไม่มีอีเมลการตลาด",
        "The system emails you only about your account — confirming your email, changing it, or resetting your password. There are no marketing emails.",
      ),
    ],
    [
      t("สิทธิของคุณ", "Your rights"),
      t(
        "ดูและแก้ข้อมูลได้ในแอปตลอดเวลา ส่งออกทั้งหมดเป็น CSV ได้ในหน้าตั้งค่า และลบบัญชีได้เอง — เมื่อลบ ข้อมูลทุกอย่างรวมถึงใบเสร็จถูกลบทันที ไม่มีสำเนาที่กู้กลับได้",
        "You can view and edit your data in the app at any time, export everything as CSV from Settings, and delete your account yourself — deletion immediately removes all data including receipts, with no recoverable copy.",
      ),
    ],
    [
      t("ติดต่อ", "Contact"),
      t(
        "คำถามเกี่ยวกับข้อมูลส่วนตัว แจ้งได้ที่ GitHub repository ของโปรเจกต์ (BossPanyawut/RaiRap)",
        "For questions about your personal data, contact us via the project's GitHub repository (BossPanyawut/RaiRap).",
      ),
    ],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-16 sm:p-6">
      <GlassCard className="p-8">
        <h1 className="text-2xl font-semibold">
          {t("นโยบายความเป็นส่วนตัว", "Privacy policy")}
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

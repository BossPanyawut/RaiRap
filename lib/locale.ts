export const LOCALE_COOKIE = "rairap-locale";
export type Locale = "th" | "en";

export function localize(locale: Locale, thai: string, english: string) {
  return locale === "en" ? english : thai;
}

const DEFAULT_NAME_EN: Record<string, string> = {
  "อาหาร": "Food",
  "เดินทาง": "Transport",
  "ที่พัก": "Housing",
  "บันเทิง": "Entertainment",
  "ช้อปปิ้ง": "Shopping",
  "สุขภาพ": "Health",
  "อื่น ๆ": "Other",
  "เงินเดือน": "Salary",
  "รายได้เสริม": "Extra income",
};

export function localizeDefaultName(locale: Locale, name: string) {
  return locale === "en" ? (DEFAULT_NAME_EN[name] ?? name) : name;
}

const SYSTEM_MESSAGE_EN: ReadonlyArray<readonly [string, string]> = [
  ["เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง", "Your session has expired. Sign in again."],
  ["จำนวนเงินเกินที่ระบบเก็บได้", "The amount exceeds the system limit"],
  ["รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัว", "The new password must be at least 8 characters"],
  ["รหัสผ่านต้องยาวอย่างน้อย 8 ตัว", "The password must be at least 8 characters"],
  ["รหัสผ่านใหม่สองช่องไม่ตรงกัน", "The new passwords do not match"],
  ["รหัสผ่านปัจจุบันไม่ถูกต้อง", "The current password is incorrect"],
  ["เพิ่มหมวดหมู่เริ่มต้นที่ขาดกลับมาแล้ว หมวดที่คุณสร้างเองไม่ถูกแตะ", "Missing default categories were restored. Your custom categories were not changed."],
  ["เลือกได้ถึงวันที่ 28 เท่านั้น เพราะทุกเดือนมีวันที่ 28 เสมอ", "Choose a day up to 28 so it exists in every month"],
  ["วันเริ่มรอบต้องอยู่ระหว่าง 1–28", "The billing cycle start must be between 1 and 28"],
  ["วันเริ่มรอบต้องเป็นจำนวนเต็ม", "The billing cycle start must be a whole number"],
  ["ส่งลิงก์ยืนยันไม่สำเร็จ ลองอีกครั้ง", "Could not send the confirmation links. Try again."],
  ["เปลี่ยนรหัสผ่านไม่สำเร็จ ลองอีกครั้ง", "Could not change the password. Try again."],
  ["รีเซ็ตหมวดหมู่ไม่สำเร็จ ลองอีกครั้ง", "Could not reset the categories. Try again."],
  ["สร้างหมวดหมู่ที่ขาดไม่สำเร็จ ลองอีกครั้ง", "Could not create the missing categories. Try again."],
  ["สร้างเป้าหมายไม่สำเร็จ ลองอีกครั้ง", "Could not create the goal. Try again."],
  ["สร้างรายการไม่สำเร็จ ลองอีกครั้ง", "Could not create the transactions. Try again."],
  ["สร้างกฎไม่สำเร็จ ลองอีกครั้ง", "Could not create the rule. Try again."],
  ["คัดลอกงบไม่สำเร็จ ลองอีกครั้ง", "Could not copy the budget. Try again."],
  ["เปลี่ยนชื่อไม่สำเร็จ ลองอีกครั้ง", "Could not rename it. Try again."],
  ["อัปโหลดไม่สำเร็จ ลองอีกครั้ง", "Could not upload the file. Try again."],
  ["แก้ไขไม่สำเร็จ ลองอีกครั้ง", "Could not save the changes. Try again."],
  ["ตั้งงบไม่สำเร็จ ลองอีกครั้ง", "Could not set the budget. Try again."],
  ["เพิ่มหมวดไม่สำเร็จ ลองอีกครั้ง", "Could not add the category. Try again."],
  ["เพิ่มบัญชีไม่สำเร็จ ลองอีกครั้ง", "Could not add the account. Try again."],
  ["นำเข้าไม่สำเร็จ ลองอีกครั้ง", "Could not import the file. Try again."],
  ["ลบบัญชีไม่สำเร็จ ลองอีกครั้ง", "Could not delete the account. Try again."],
  ["บันทึกไม่สำเร็จ ลองอีกครั้ง", "Could not save. Try again."],
  ["ลบไม่สำเร็จ ลองอีกครั้ง", "Could not delete the transactions. Try again."],
  ["อีเมลหรือรหัสผ่านไม่ถูกต้อง", "Email or password is incorrect"],
  ["อีเมลนี้คืออีเมลปัจจุบันอยู่แล้ว", "This is already your current email"],
  ["รับเฉพาะรูป JPG, PNG, WebP หรือไฟล์ PDF", "Only JPG, PNG, WebP, and PDF files are supported"],
  ["วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end date cannot be before the start date"],
  ["เดือนก่อนหน้ายังไม่ได้ตั้งงบไว้", "No budget was set for the previous month"],
  ["ไม่มีรายการให้ลบในช่วงที่เลือก", "There are no transactions to delete in the selected period"],
  ["ไม่มีงวดที่ค้างอยู่", "There are no overdue installments"],
  ["ไม่มีแถวที่นำเข้าได้", "No rows can be imported"],
  ["มีเป้าหมายชื่อนี้อยู่แล้ว", "A goal with this name already exists"],
  ["มีหมวดชื่อนี้อยู่แล้ว", "A category with this name already exists"],
  ["มีหมวดนี้อยู่แล้ว", "This category already exists"],
  ["มีบัญชีชื่อนี้อยู่แล้ว", "An account with this name already exists"],
  ["ชื่อหมวดไม่ถูกต้อง", "The category name is invalid"],
  ["ชื่อบัญชีไม่ถูกต้อง", "The account name is invalid"],
  ["ไม่พบหมวดหมู่นี้", "Category not found"],
  ["ไม่พบรายการนี้", "Transaction not found"],
  ["เลือกช่วงวันที่ให้ครบ", "Select both the start and end dates"],
  ["เลือกหมวดหมู่", "Choose a category"],
  ["เลือกไฟล์ CSV ก่อน", "Choose a CSV file first"],
  ["เลือกไฟล์ก่อน", "Choose a file first"],
  ["ไฟล์ใหญ่เกิน 5 MB", "The file is larger than 5 MB"],
  ["ไฟล์ใหญ่เกิน 2 MB", "The file is larger than 2 MB"],
  ["วันที่เริ่มไม่ถูกต้อง", "The start date is invalid"],
  ["วันที่ไม่ถูกต้อง", "The date is invalid"],
  ["เดือนไม่ถูกต้อง", "The month is invalid"],
  ["งบผูกกับเดือน ต้องเป็นวันที่ 1", "A monthly budget must start on day 1"],
  ["งบติดลบไม่ได้", "The budget cannot be negative"],
  ["บันทึกย่อยาวเกิน 200 ตัว", "The note must be 200 characters or fewer"],
  ["เป้าหมายต้องมากกว่า 0", "The goal must be greater than 0"],
  ["จำนวนเงินต้องมากกว่า 0", "The amount must be greater than 0"],
  ["ใส่รหัสผ่านปัจจุบัน", "Enter your current password"],
  ["ใส่รหัสผ่าน", "Enter your password"],
  ["ใส่ชื่อที่อยากให้เรียก", "Enter your display name"],
  ["ใส่ชื่อเป้าหมาย", "Enter a goal name"],
  ["ใส่ชื่อหมวดหมู่", "Enter a category name"],
  ["ใส่ชื่อบัญชี", "Enter an account name"],
  ["ใส่จำนวนเงิน", "Enter an amount"],
  ["ชื่อยาวเกิน 60 ตัว", "The name must be 60 characters or fewer"],
  ["ชื่อยาวเกิน 40 ตัว", "The name must be 40 characters or fewer"],
  ["อีเมลไม่ถูกต้อง", "Enter a valid email address"],
  ["ต้องมากกว่า 0", "Must be greater than 0"],
  ["มากเกินไป", "The value is too high"],
  ["เปลี่ยนรหัสผ่านแล้ว", "Password changed"],
  ["สร้างกฎแล้ว", "Recurring rule created"],
  ["บันทึกแล้ว", "Saved"],
];

/** Translate action and validation messages that originate in server actions. */
export function localizeSystemMessage(locale: Locale, message: string) {
  if (locale === "th") return message;

  let result = message
    .replace(/สร้างกฎแล้ว และเพิ่มรายการย้อนหลังให้ (\d+) รายการ/g, "Recurring rule created and $1 past transactions added")
    .replace(/เพิ่ม (\d+) รายการ/g, "Added $1 transactions")
    .replace(/พิมพ์ (\d+) ในช่องยืนยันเพื่อยืนยันว่าจะลบ (\d+) รายการ/g, "Enter $1 to confirm deleting $2 transactions")
    .replace(/พิมพ์ (.+) ในช่องยืนยัน/g, "Enter $1 in the confirmation field")
    .replace(/ลบ (\d+) รายการแล้ว/g, "Deleted $1 transactions")
    .replace(/และลบงบ (\d+) รายการ/g, "and deleted $1 budgets")
    .replace(/ส่งลิงก์ยืนยันไปที่ (.+) และ (.+) แล้ว ต้องกดยืนยันทั้งสองฉบับ อีเมลถึงจะเปลี่ยน/g, "Confirmation links were sent to $1 and $2. Confirm both messages to change your email.");
  for (const [thai, english] of SYSTEM_MESSAGE_EN) {
    result = result.replaceAll(thai, english);
  }

  return result;
}

export const localeCopy = {
  th: {
    nav: {
      overview: "ภาพรวม",
      transactions: "รายการ",
      profile: "โปรไฟล์",
      main: "เมนูหลัก",
      mobileMain: "เมนูหลักบนมือถือ",
    },
    profile: {
      title: "โปรไฟล์",
      fallbackName: "ผู้ใช้ RaiRap",
      everyday: "วางแผนและติดตาม",
      moneyTools: "จัดการการเงิน",
      accountTools: "ข้อมูลและบัญชีผู้ใช้",
      signOut: "ออกจากระบบ",
      links: {
        budgets: ["งบ", "กำหนดวงเงินและติดตามการใช้จ่าย"],
        goals: ["เป้าหมาย", "ติดตามเงินเก็บสำหรับสิ่งที่วางแผนไว้"],
        analytics: ["วิเคราะห์", "ดูแนวโน้มและรูปแบบการเงิน"],
        accounts: ["บัญชีและกระเป๋าเงิน", "แยกเงินสด บัตร และบัญชีธนาคาร"],
        recurring: ["รายการเกิดซ้ำ", "ตั้งรายรับและค่าใช้จ่ายประจำ"],
        categories: ["หมวดหมู่", "จัดกลุ่มรายการตามแบบของคุณ"],
        report: ["รายงาน", "สรุปรอบเดือนและบันทึกเป็น PDF"],
        settings: ["ตั้งค่า", "ชื่อ รอบเดือน สกุลเงิน และข้อมูล"],
      },
    },
    preferences: {
      title: "การแสดงผลและภาษา",
      theme: "ธีม",
      themeHint: "เลือกรูปแบบที่สบายตา",
      light: "สว่าง",
      dark: "มืด",
      language: "ภาษา",
      languageHint: "เปลี่ยนภาษาของทั้งแอป",
      thai: "ไทย",
      english: "English",
    },
    settingsTitle: "ตั้งค่า",
    alerts: {
      title: "การแจ้งเตือน",
      buttonEmpty: "การแจ้งเตือน ไม่มีรายการใหม่",
      buttonCount: (count: number) => `การแจ้งเตือน ${count} รายการ`,
      empty: "ทุกหมวดยังอยู่ในงบ ถ้าหมวดไหนใช้ถึง 80% จะแจ้งตรงนี้",
      over: (name: string) => `${name} ใช้เกินงบแล้ว`,
      near: (name: string) => `${name} ใกล้เต็มวงเงิน`,
      usage: (spent: string, budget: string, pct: number) =>
        `ใช้ไป ${spent} จากงบ ${budget} (${pct}%)`,
      dismiss: "ปิด",
      dismissLabel: (name: string) => `ปิดการแจ้งเตือนของหมวด${name}`,
    },
  },
  en: {
    nav: {
      overview: "Overview",
      transactions: "Transactions",
      profile: "Profile",
      main: "Main navigation",
      mobileMain: "Mobile navigation",
    },
    profile: {
      title: "Profile",
      fallbackName: "RaiRap user",
      everyday: "Plan and track",
      moneyTools: "Money management",
      accountTools: "Data and account",
      signOut: "Sign out",
      links: {
        budgets: ["Budgets", "Set limits and track your spending"],
        goals: ["Goals", "Track savings for what you are planning"],
        analytics: ["Analytics", "See financial trends and patterns"],
        accounts: ["Accounts and wallets", "Separate cash, cards, and bank accounts"],
        recurring: ["Recurring transactions", "Set up regular income and expenses"],
        categories: ["Categories", "Organize transactions your way"],
        report: ["Reports", "Review a billing cycle and save it as PDF"],
        settings: ["Settings", "Name, billing cycle, currency, and data"],
      },
    },
    preferences: {
      title: "Appearance and language",
      theme: "Theme",
      themeHint: "Choose the appearance that feels comfortable",
      light: "Light",
      dark: "Dark",
      language: "Language",
      languageHint: "Change the language across the entire app",
      thai: "ไทย",
      english: "English",
    },
    settingsTitle: "Settings",
    alerts: {
      title: "Notifications",
      buttonEmpty: "Notifications, no new items",
      buttonCount: (count: number) => `${count} notifications`,
      empty: "All categories are within budget. Alerts appear here when one reaches 80%.",
      over: (name: string) => `${name} is over budget`,
      near: (name: string) => `${name} is close to its limit`,
      usage: (spent: string, budget: string, pct: number) =>
        `Spent ${spent} of ${budget} (${pct}%)`,
      dismiss: "Dismiss",
      dismissLabel: (name: string) => `Dismiss the notification for ${name}`,
    },
  },
} as const;

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-only.mjs";

const { url: SB, service: SERVICE, app: APP } = localSupabase();

const OUT = "./.gate-output";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); if (ok) { pass++; } else { fail++; } };
const money = (s) => Number(String(s).replace(/[^\d.-]/g, ""));

const admin = createClient(SB, SERVICE, { auth: { persistSession: false } });
const email = `e2e${Date.now()}@test.local`;
const PW = "password123";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });

// ============ สมัคร ============
await page.goto(`${APP}/signup`);
await page.fill("#displayName", "E2E User");
await page.fill("#email", email);
await page.fill("#password", PW);
await page.click('button[type=submit]');
await page.waitForURL(APP + "/", { timeout: 20000 });
check("สมัครแล้วเข้าหน้าภาพรวมได้", page.url() === APP + "/");

// ============ navigation hierarchy ============
{
  const mainLabels = await page
    .locator('nav[aria-label="เมนูหลัก"] a')
    .allTextContents();
  check(
    "เมนูหลักเหลือภาพรวมและรายการ ส่วนโปรไฟล์เป็นทางเข้าฟีเจอร์รอง",
    mainLabels.join("|") === "ภาพรวม|รายการ",
    mainLabels.join(" | "),
  );

  await page.goto(`${APP}/profile`, { waitUntil: "networkidle" });
  const profileHrefs = await page
    .locator("main a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  check(
    "หน้าโปรไฟล์รวมทางเข้าฟีเจอร์รองครบ",
    ["/budgets", "/goals", "/analytics", "/report", "/accounts", "/recurring", "/categories", "/settings"].every(
      (href) => profileHrefs.includes(href),
    ),
    profileHrefs.join(" | "),
  );

  await page.click('[data-locale-option="en"]');
  await page.waitForFunction(() => document.documentElement.lang === "en");
  const englishShell = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.querySelector("main h1")?.textContent,
    nav: [...document.querySelectorAll('nav[aria-label="Main navigation"] a')].map((item) => item.textContent.trim()),
  }));
  check(
    "เปลี่ยนภาษาอังกฤษแล้วอัปเดต lang เมนู และโปรไฟล์ตั้งแต่ server render",
    englishShell.lang === "en" && englishShell.title === "Profile" && englishShell.nav.join("|") === "Overview|Transactions",
    JSON.stringify(englishShell),
  );

  const englishRoutes = [
    "/",
    "/transactions",
    "/transactions?view=calendar&scope=month",
    "/budgets",
    "/goals",
    "/analytics",
    "/profile",
    "/report",
    "/accounts",
    "/recurring",
    "/categories",
    "/settings",
  ];
  const thaiLeaks = [];
  for (const path of englishRoutes) {
    await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
    const leaks = await page.evaluate(() => {
      // Thai letters, marks, and digits. Deliberately excludes ฿ (U+0E3F),
      // which remains the user's currency symbol in the English interface.
      const thai = /[\u0E01-\u0E3A\u0E40-\u0E5B]/;
      const values = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, [data-locale-option='th']")) continue;
        const value = node.textContent.trim();
        if (value && thai.test(value)) values.push(value);
      }
      for (const element of document.querySelectorAll("[aria-label], [placeholder], [title]")) {
        if (element.closest("[data-locale-option='th']")) continue;
        for (const attribute of ["aria-label", "placeholder", "title"]) {
          const value = element.getAttribute(attribute)?.trim();
          if (value && thai.test(value)) values.push(`${attribute}=${value}`);
        }
      }
      return [...new Set(values)];
    });
    if (leaks.length) thaiLeaks.push(`${path}: ${leaks.join(" | ")}`);
  }
  check(
    "ภาษาอังกฤษครอบคลุมทุกหน้าหลัก ไม่มีข้อความ UI ภาษาไทยหลงเหลือ",
    thaiLeaks.length === 0,
    thaiLeaks.join(" || ") || `${englishRoutes.length} routes`,
  );

  const authContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const appUrl = new URL(APP);
  await authContext.addCookies([{
    name: "rairap-locale",
    value: "en",
    domain: appUrl.hostname,
    path: "/",
  }]);
  const authPage = await authContext.newPage();
  const authLeaks = [];
  for (const path of ["/login", "/signup"]) {
    await authPage.goto(`${APP}${path}`, { waitUntil: "networkidle" });
    const text = await authPage.locator("body").innerText();
    const thai = /[\u0E01-\u0E3A\u0E40-\u0E5B]/;
    if (thai.test(text)) authLeaks.push(`${path}: ${text.match(/[\u0E01-\u0E3A\u0E40-\u0E5B][^\n]*/g)?.join(" | ")}`);
  }
  await authContext.close();
  check(
    "หน้าเข้าสู่ระบบและสมัครสมาชิกเปลี่ยนเป็นภาษาอังกฤษ",
    authLeaks.length === 0,
    authLeaks.join(" || ") || "login + signup",
  );

  await page.click('[data-theme-option="dark"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  check(
    "เปลี่ยนธีมจากหน้าโปรไฟล์แล้วใช้กับ HTML ทันที",
    await page.evaluate(() => document.documentElement.dataset.theme === "dark"),
  );
  await page.click('[data-theme-option="light"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
  await page.click('[data-locale-option="th"]');
  await page.waitForFunction(() => document.documentElement.lang === "th");
  await page.goto(APP + "/", { waitUntil: "networkidle" });
}

// ============ จดจำฉัน ============
async function loginCookieMode(rememberMe, cookie = "") {
  const loginPage = await fetch(`${APP}/login`, {
    headers: cookie ? { cookie } : {},
  });
  const html = await loginPage.text();
  const form = new FormData();
  for (const match of html.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\/>/g)) {
    form.append(
      match[1],
      (match[2] ?? "").replaceAll("&quot;", '"').replaceAll("&amp;", "&"),
    );
  }
  form.append("email", email);
  form.append("password", PW);
  if (rememberMe) form.append("rememberMe", "on");

  const response = await fetch(`${APP}/login`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
    redirect: "manual",
  });
  const setCookies = response.headers.getSetCookie();
  const auth = setCookies.filter(
    (value) => /^sb-[^=]+=/.test(value) && !/Max-Age=0/i.test(value),
  );
  const markers = setCookies.filter((value) =>
    value.startsWith("rairap-session-only="),
  );
  return { html, response, auth, markers };
}

{
  const temporary = await loginCookieMode(false);
  check(
    "หน้า login มี checkbox จดจำฉัน",
    /name="rememberMe"/.test(temporary.html) && /จดจำฉัน/.test(temporary.html),
  );
  check(
    "ไม่เลือกจดจำฉัน → auth cookie อยู่เฉพาะ browser session",
    temporary.response.status === 303 &&
      temporary.auth.length > 0 &&
      temporary.auth.every((value) => !/(?:Max-Age|Expires)=/i.test(value)) &&
      temporary.markers.some(
        (value) => !/(?:Max-Age|Expires)=/i.test(value),
      ),
  );

  const remembered = await loginCookieMode(true, "rairap-session-only=1");
  check(
    "เลือกจดจำฉัน → auth cookie มีอายุและล้าง session-only marker",
    remembered.response.status === 303 &&
      remembered.auth.length > 0 &&
      remembered.auth.some((value) => /(?:Max-Age|Expires)=/i.test(value)) &&
      remembered.markers.some((value) =>
        /(?:Max-Age=0|Expires=Thu, 01 Jan 1970)/i.test(value),
      ),
  );
}

// ============ empty state ============
{
  const txt = await page.textContent("main");
  check("ยังไม่มีรายการ → หน้าจอชวนลงมือ ไม่ใช่ ฿ 0",
    /เริ่มบันทึกรายการแรก/.test(txt) && !/฿\s*0/.test(txt), txt.trim().slice(0, 50));
  await page.screenshot({ path: `${OUT}/e2e-empty.png` });
}

// ============ PHASE 2 GATE: 20 รายการ ============
const { data: { users } } = await admin.auth.admin.listUsers();
const me = users.find((u) => u.email === email);
const { data: cats } = await admin.from("categories").select("*").eq("user_id", me.id);
const cat = (n, k) => cats.find((c) => c.name === n && c.kind === k).id;

const PERIOD = new Date().toISOString().slice(0, 7);
const day = (d) => `${PERIOD}-${String(d).padStart(2, "0")}`;

// รายจ่าย 18 รายการ + รายรับ 2 รายการ — จงใจใส่ทศนิยมให้เห็นว่า numeric ไม่เพี้ยน
const tx = [
  ...Array.from({ length: 8 }, (_, i) => ({ c: cat("อาหาร", "expense"), k: "expense", a: 100.25, d: day(i + 1) })),
  ...Array.from({ length: 5 }, (_, i) => ({ c: cat("เดินทาง", "expense"), k: "expense", a: 210.1, d: day(i + 1) })),
  ...Array.from({ length: 3 }, (_, i) => ({ c: cat("บันเทิง", "expense"), k: "expense", a: 333.33, d: day(i + 1) })),
  { c: cat("ช้อปปิ้ง", "expense"), k: "expense", a: 1234.56, d: day(2) },
  { c: cat("สุขภาพ", "expense"), k: "expense", a: 80.5, d: day(3) },
  { c: cat("เงินเดือน", "income"), k: "income", a: 25000, d: day(1) },
  { c: cat("รายได้เสริม", "income"), k: "income", a: 3500.75, d: day(5) },
];
await admin.from("transactions").insert(
  tx.map((t) => ({ user_id: me.id, category_id: t.c, kind: t.k, amount: t.a, occurred_on: t.d })),
);

const expectIncome = tx.filter((t) => t.k === "income").reduce((s, t) => s + t.a, 0);
const expectExpense = tx.filter((t) => t.k === "expense").reduce((s, t) => s + t.a, 0);
const expectBalance = expectIncome - expectExpense;

// ============ ตัวกรองช่วงเวลา + ปฏิทิน ============
console.log("\n--- ตัวกรองช่วงเวลา + ปฏิทิน ---");
await page.goto(`${APP}/transactions?view=calendar&scope=month&at=${PERIOD}-15`, { waitUntil: "networkidle" });
{
  const calendar = page.locator('[data-calendar-view="month"]');
  check("เปิดมุมมองปฏิทินรายเดือนได้", await calendar.isVisible(), "");
  check(
    "ปฏิทินรายเดือนมีทุกวันของเดือน",
    await calendar.locator('a[href*="scope=day"]').count() >= 28,
    `พบ ${await calendar.locator('a[href*="scope=day"]').count()} วัน`,
  );
  const firstDay = calendar.locator('a[href*="at=' + day(1) + '"]');
  const firstLabel = await firstDay.getAttribute("aria-label");
  check(
    "ยอดรายวันในปฏิทินรวมจาก Postgres ถูกต้อง",
    /25,000\.00/.test(firstLabel ?? "") && /643\.68/.test(firstLabel ?? ""),
    firstLabel ?? "ไม่พบวันแรก",
  );

  const nextMonth = new Date(`${PERIOD}-15T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const nextAnchor = nextMonth.toISOString().slice(0, 10);
  await page.getByRole("button", { name: "ช่วงถัดไป" }).click();
  await page.waitForURL((url) => url.searchParams.get("at") === nextAnchor);
  check("ปุ่มช่วงถัดไปเปลี่ยนเดือนใน URL", page.url().includes(`at=${nextAnchor}`), page.url());

  await page.locator("[data-open-time-filter]").click();
  await page.getByRole("button", { name: "กำหนดช่วงเอง" }).click();
  await page.waitForURL(/scope=custom/);
  check(
    "ช่วงกำหนดเองมีวันเริ่มและวันสิ้นสุด",
    await page.locator('input[name="from"]').isVisible() && await page.locator('input[name="to"]').isVisible(),
    page.url(),
  );

  await page.goto(`${APP}/transactions?view=list&scope=month&at=${PERIOD}-15`, { waitUntil: "networkidle" });
  const amountColors = await page.locator("[data-transaction-amount]").evaluateAll((amounts) => {
    const income = amounts.find((amount) => amount.dataset.kind === "income");
    const expense = amounts.find((amount) => amount.dataset.kind === "expense");
    return {
      income: income ? getComputedStyle(income).color : "",
      expense: expense ? getComputedStyle(expense).color : "",
      incomeText: income?.textContent ?? "",
      expenseText: expense?.textContent ?? "",
    };
  });
  check(
    "ตัวเลขรายรับ/รายจ่ายใช้คนละสีและยังมีเครื่องหมาย",
    amountColors.income && amountColors.expense && amountColors.income !== amountColors.expense &&
      amountColors.incomeText.trim().startsWith("+") && amountColors.expenseText.trim().startsWith("−"),
    JSON.stringify(amountColors),
  );
}

await page.goto(APP + "/", { waitUntil: "networkidle" });
{
  const hero = money(await page.textContent(".money"));
  check(`ยอด hero = ผลรวมมือ (${tx.length} รายการ)`, Math.abs(hero - expectBalance) < 0.5,
    `จอ=${hero} คำนวณ=${expectBalance.toFixed(2)}`);
  const sub = await page.textContent(".hero-card p:nth-of-type(2)");
  check("รายรับ/รายจ่ายบน hero ตรง", money(sub.split("·")[0]) === Math.round(expectIncome) && money(sub.split("·")[1]) === Math.round(expectExpense),
    sub.trim());
}

// ============ PHASE 3 GATE: ขอบเขต 79 → 80 → 101 ============
console.log("\n--- PHASE 3 GATE: ขอบเขตสถานะงบ ---");
const foodId = cat("อาหาร", "expense");
const foodSpent = 8 * 100.25; // 802.00

async function setBudgetSoPct(target) {
  const amount = Math.round((foodSpent / target) * 10000) / 100;
  await admin.from("budgets").delete().eq("user_id", me.id).eq("category_id", foodId);
  await admin.from("budgets").insert({
    user_id: me.id, category_id: foodId, kind: "expense",
    period_month: `${PERIOD}-01`, amount,
  });
  const { data } = await admin.from("v_budget_usage").select("pct, status")
    .eq("user_id", me.id).eq("category_id", foodId).single();
  return data;
}

for (const [target, wantStatus, wantOnDash] of [[79, "ok", false], [80, "warn", true], [101, "over", true]]) {
  const db = await setBudgetSoPct(target);
  await page.goto(APP + "/", { waitUntil: "networkidle" });
  const dash = await page.textContent("main");
  const onDash = /อาหาร/.test(dash);
  check(`${target}% → DB status = ${wantStatus}`, db.status === wantStatus, `DB pct=${db.pct} status=${db.status}`);
  check(`${target}% → การ์ด${wantOnDash ? "โผล่" : "ไม่โผล่"}บน dashboard`, onDash === wantOnDash,
    onDash ? "โผล่" : "ไม่โผล่");

  if (wantOnDash) {
    // สีแท่ง + ไอคอน/ข้อความต้องตรงสถานะ — ไม่สื่อด้วยสีอย่างเดียว
    const bar = await page.evaluate(() => {
      const pb = [...document.querySelectorAll('[role=progressbar]')]
        .find((e) => e.getAttribute("aria-label") === "อาหาร");
      return pb ? { cls: pb.firstElementChild.className, txt: pb.parentElement.textContent } : null;
    });
    const wantCls = { warn: "bar-warn", over: "bar-over" }[wantStatus];
    check(`${target}% → แท่งใช้ ${wantCls}`, bar?.cls.includes(wantCls), bar?.cls);
    if (wantStatus === "over") {
      check(`${target}% → มีข้อความ "ใช้เกินงบ" คู่กับสี`, /ใช้เกินงบ/.test(bar?.txt ?? ""), "");
    }
  }
}

// ============ ฝั่ง client กับ Postgres ต้องไม่แตกเป็นสองความจริง ============
console.log("\n--- pct ปัดตรงกันระหว่าง JS กับ Postgres ---");
{
  let drift = [];
  for (const target of [79.94, 79.96, 79.99, 80.0, 80.04, 99.9, 100.0, 100.04, 100.06]) {
    const amount = Math.round((foodSpent / target) * 10000) / 100;
    await admin.from("budgets").delete().eq("user_id", me.id).eq("category_id", foodId);
    await admin.from("budgets").insert({
      user_id: me.id, category_id: foodId, kind: "expense", period_month: `${PERIOD}-01`, amount,
    });
    const { data } = await admin.from("v_budget_usage").select("pct, status").eq("category_id", foodId).single();
    // ตรรกะเดียวกับ lib/money.ts
    const jsPct = Math.round((foodSpent / amount) * 1000) / 10;
    const jsStatus = jsPct > 100 ? "over" : jsPct >= 80 ? "warn" : "ok";
    if (jsStatus !== data.status || Math.abs(jsPct - Number(data.pct)) > 0.001) {
      drift.push(`~${target}%: PG=${data.pct}/${data.status} JS=${jsPct}/${jsStatus}`);
    }
  }
  check("ทุกค่าขอบเขต JS ตรงกับ Postgres", drift.length === 0, drift.join(" | ") || "ไม่มี drift");
}

// ============ PHASE 4 GATE: กราฟ ============
console.log("\n--- PHASE 4 GATE: กราฟ ---");
await page.goto(APP + "/analytics", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
{
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("table tbody tr")].map((tr) => ({
      name: tr.children[0].textContent.trim(),
      amount: Number(tr.children[1].textContent.replace(/[^\d.]/g, "")),
    })),
  );
  const tableTotal = rows.reduce((s, r) => s + r.amount, 0);
  check("ยอดรวมในตารางกราฟ = รายจ่ายจริง", Math.abs(tableTotal - expectExpense) < 1,
    `ตาราง=${tableTotal.toFixed(2)} จริง=${expectExpense.toFixed(2)}`);
  check("slice ไม่เกิน 6 ชิ้น (ขอบที่สกิล dataviz กำหนด)", rows.length <= 6, `${rows.length} ชิ้น`);
  check("เรียงจากมากไปน้อย", rows.every((r, i) => i === 0 || rows[i - 1].amount >= r.amount),
    rows.map((r) => r.amount).join(" ≥ "));

  // BalanceTrend ต้องมี ≥2 เดือนถึงจะวาด — user นี้มีเดือนเดียว จึงเห็น 2 กราฟ
  const charts = await page.locator(".recharts-wrapper").count();
  check("มีข้อมูลเดือนเดียว → วาด 2 กราฟ, trend แสดงข้อความแทน", charts === 2, `เจอ ${charts}`);
}

// ============ ยกยอดสะสมข้ามเดือน (spec 2.3) ============
console.log("\n--- ยกยอดข้ามเดือน ---");
{
  const shift = (n) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 7);
  };
  const salary = cat("เงินเดือน", "income");
  const food = cat("อาหาร", "expense");

  // เดือน -2: +1000 / เดือน -1: -400 → สะสมควรเป็น 1000, 600, และเดือนนี้ต่อยอด
  await admin.from("transactions").insert([
    { user_id: me.id, category_id: salary, kind: "income", amount: 1000, occurred_on: `${shift(-2)}-05` },
    { user_id: me.id, category_id: food, kind: "expense", amount: 400, occurred_on: `${shift(-1)}-05` },
    { user_id: me.id, category_id: food, kind: "expense", amount: 100, occurred_on: `${PERIOD}-05` },
  ]);

  const { data: rb } = await admin.from("v_running_balance")
    .select("period_month, net, balance").eq("user_id", me.id).order("period_month");
  const got = rb.map((r) => `${r.period_month.slice(0, 7)}:net=${r.net},bal=${r.balance}`);
  // ตรวจตามนิยาม: balance ของเดือนที่ i = ผลรวม net ตั้งแต่เดือนแรกถึงเดือนนั้น
  let acc = 0;
  const ok = rb.every((r) => {
    acc += Number(r.net);
    return Math.abs(Number(r.balance) - acc) < 0.005;
  });
  check(`balance = ผลรวมสะสมของ net (${rb.length} เดือน)`, ok, got.join(" | "));
  check("เดือนที่ติดลบยังยกยอดถูก", Number(rb[1].net) < 0 && Number(rb[1].balance) === 600,
    `net=${rb[1].net} bal=${rb[1].balance}`);

  await page.goto(APP + "/analytics", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const charts3 = await page.locator(".recharts-wrapper").count();
  check("มี 3 เดือน → วาดครบ 3 กราฟ", charts3 === 3, `เจอ ${charts3}`);
  await page.screenshot({ path: `${OUT}/e2e-analytics.png`, fullPage: true });

  await page.goto(APP + "/", { waitUntil: "networkidle" });
  const dashTxt = await page.textContent(".hero-card");
  check("hero บอกยอดยกมาเมื่อมีของเดือนก่อน", /ยกมาจากเดือนก่อน/.test(dashTxt), dashTxt.replace(/\s+/g, " ").trim().slice(0, 90));
  await page.screenshot({ path: `${OUT}/e2e-analytics.png`, fullPage: true });
}

// ============ เดือนที่ไม่มีข้อมูลต้องไม่พัง ============
{
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await admin.from("transactions").delete().eq("user_id", me.id);
  await page.goto(APP + "/analytics", { waitUntil: "networkidle" });
  const txt = await page.textContent("main");
  check("ไม่มีข้อมูลเลย → หน้ากราฟไม่พัง", errs.length === 0 && /ยังไม่มีรายจ่าย|ยังไม่มีข้อมูล/.test(txt),
    errs[0] ?? "แสดงข้อความแทนกราฟ");
}

console.log(`\n${fail === 0 ? "GATE ผ่าน" : "GATE ไม่ผ่าน"} — pass ${pass} / fail ${fail}`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);

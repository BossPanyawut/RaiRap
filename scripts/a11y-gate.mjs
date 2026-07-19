import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { localSupabase } from "./local-only.mjs";

const { url: SB, service: SERVICE, app: APP } = localSupabase();

const OUT = "./.gate-output";
const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); if (ok) { pass++; } else { fail++; } };

const admin = createClient(SB, SERVICE, { auth: { persistSession: false } });
const email = `a11y${Date.now()}@test.local`;
const PW = "password123";
await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: { display_name: "ปัญญาวุฒิ" } });
const { data: { users } } = await admin.auth.admin.listUsers();
const me = users.find((u) => u.email === email);
const { data: cats } = await admin.from("categories").select("*").eq("user_id", me.id);
const cat = (n, k) => cats.find((c) => c.name === n && c.kind === k).id;

const P = new Date().toISOString().slice(0, 7);
const shift = (n) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
await admin.from("transactions").insert([
  { user_id: me.id, category_id: cat("เงินเดือน", "income"), kind: "income", amount: 25000, occurred_on: `${P}-01` },
  { user_id: me.id, category_id: cat("อาหาร", "expense"), kind: "expense", amount: 4600, occurred_on: `${P}-05` },
  { user_id: me.id, category_id: cat("เดินทาง", "expense"), kind: "expense", amount: 2100, occurred_on: `${P}-06` },
  { user_id: me.id, category_id: cat("ที่พัก", "expense"), kind: "expense", amount: 5520, occurred_on: `${P}-07` },
  { user_id: me.id, category_id: cat("บันเทิง", "expense"), kind: "expense", amount: 880, occurred_on: `${P}-08` },
  { user_id: me.id, category_id: cat("เงินเดือน", "income"), kind: "income", amount: 25000, occurred_on: `${shift(-1)}-01` },
  { user_id: me.id, category_id: cat("อาหาร", "expense"), kind: "expense", amount: 3000, occurred_on: `${shift(-1)}-05` },
  { user_id: me.id, category_id: cat("เงินเดือน", "income"), kind: "income", amount: 25000, occurred_on: `${shift(-2)}-01` },
]);
await admin.from("budgets").insert([
  { user_id: me.id, category_id: cat("อาหาร", "expense"), kind: "expense", period_month: `${P}-01`, amount: 5000 },
  { user_id: me.id, category_id: cat("เดินทาง", "expense"), kind: "expense", amount: 2000, period_month: `${P}-01` },
  { user_id: me.id, category_id: cat("ที่พัก", "expense"), kind: "expense", amount: 6000, period_month: `${P}-01` },
  { user_id: me.id, category_id: cat("บันเทิง", "expense"), kind: "expense", amount: 3000, period_month: `${P}-01` },
]);

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(APP + "/login");
await page.fill("#email", email);
await page.fill("#password", PW);
await page.click("button[type=submit]");
await page.waitForURL(APP + "/", { timeout: 20000 });

const PAGES = [
  "/", "/transactions",
  `/transactions?view=calendar&scope=month&at=${P}-15`,
  `/transactions?view=calendar&scope=year&at=${P}-15`,
  "/budgets", "/goals", "/analytics", "/profile", "/report", "/accounts", "/recurring", "/categories", "/settings",
];

// หน้าสาธารณะไม่มี bottom navigation ของแอป จึงเช็คแค่ axe + ไม่ล้นแนวนอน
const PUBLIC_PAGES = ["/welcome", "/terms", "/privacy"];

for (const theme of ["light", "dark"]) {
  console.log(`\n--- axe-core (wcag2a + wcag2aa) — โหมด${theme === "light" ? "สว่าง" : "มืด"} ---`);
  await page.context().addCookies([
    { name: "rairap-theme", value: theme, url: APP },
  ]);
  for (const path of [...PAGES, ...PUBLIC_PAGES]) {
    await page.goto(APP + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const applied = await page.evaluate(() => document.documentElement.dataset.theme);
    if (applied !== theme) {
      check(`ธีม ${theme} ถูกใส่ที่ <html> ตั้งแต่ HTML แรก`, false, `ได้ ${applied}`);
      continue;
    }
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate(async () =>
      await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        // ตัว dev overlay ของ Next ไม่ใช่โค้ดเรา
        exclude: [["nextjs-portal"]],
      }),
    );
    const v = r.violations.filter((x) => x.impact !== "minor");
    check(`axe ${theme} ${path}`, v.length === 0,
      v.length ? v.map((x) => `${x.id}(${x.impact}) x${x.nodes.length}`).join(", ") : "ไม่มี violation");
  }
}
await page.context().addCookies([{ name: "rairap-theme", value: "light", url: APP }]);

console.log("\n--- navigation แยกตามขนาดจอ ---");
await page.goto(APP + "/", { waitUntil: "networkidle" });
{
  const nav = await page.evaluate(() => ({
    desktop: getComputedStyle(document.querySelector("[data-desktop-nav]")).display,
    mobileTop: getComputedStyle(document.querySelector("[data-mobile-topbar]")).display,
    mobileBottom: getComputedStyle(document.querySelector("[data-mobile-nav]")).display,
  }));
  check(
    "desktop แสดง top navigation ชุดเดียว",
    nav.desktop === "flex" && nav.mobileTop === "none" && nav.mobileBottom === "none",
    JSON.stringify(nav),
  );
}

await page.goto(APP + "/transactions", { waitUntil: "networkidle" });
{
  await page.click("[data-open-detail-filters]");
  const popover = await page.locator('[data-filter-panel="details"]').evaluate((panel) => ({
    position: getComputedStyle(panel).position,
    width: panel.getBoundingClientRect().width,
  }));
  check(
    "desktop เปิดตัวกรองเป็น popover โดยไม่ดันรายการ",
    popover.position === "absolute" && popover.width >= 400,
    JSON.stringify(popover),
  );
  await page.locator("[data-filter-backdrop]").click({ position: { x: 4, y: 4 } });
}

console.log("\n--- 360px ไม่ล้นแนวนอน ---");
const m = await browser.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 });
await m.goto(`${APP}/login`);
await m.fill("#email", email);
await m.fill("#password", PW);
await m.click("button[type=submit]");
await m.waitForURL(APP + "/", { timeout: 20000 });
{
  const mobile = await m.evaluate(() => {
    const top = document.querySelector("[data-mobile-topbar]");
    const bottom = document.querySelector("[data-mobile-nav]");
    const desktop = document.querySelector("[data-desktop-nav]");
    const targets = [...document.querySelectorAll(
      "[data-mobile-topbar] a, [data-mobile-topbar] button, [data-mobile-nav] a",
    )]
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { label: el.getAttribute("aria-label") ?? el.textContent.trim(), width: r.width, height: r.height };
      });
    return {
      top: getComputedStyle(top).display,
      bottom: getComputedStyle(bottom).display,
      bottomPosition: getComputedStyle(bottom).position,
      desktop: getComputedStyle(desktop).display,
      labels: [...bottom.querySelectorAll("a")].map((a) => a.textContent.trim()),
      targets,
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "",
    };
  });
  check(
    "มือถือแสดง utility bar + fixed bottom navigation",
    mobile.top === "flex" && mobile.bottom === "grid" &&
      mobile.bottomPosition === "fixed" && mobile.desktop === "none",
    JSON.stringify({ top: mobile.top, bottom: mobile.bottom, position: mobile.bottomPosition, desktop: mobile.desktop }),
  );
  check(
    "bottom navigation มี 3 ปลายทางหลักพร้อม label",
    mobile.labels.join("|") === "ภาพรวม|รายการ|โปรไฟล์",
    mobile.labels.join(" | "),
  );
  const smallTargets = mobile.targets.filter((target) => target.width < 44 || target.height < 44);
  check(
    "touch target ใน navigation ไม่น้อยกว่า 44×44px",
    smallTargets.length === 0,
    smallTargets.map((target) => `${target.label} ${target.width}×${target.height}`).join(" | ") || "ผ่านทุกปุ่ม",
  );
  check(
    "viewport รองรับ safe area และยัง pinch-to-zoom ได้",
    mobile.viewport.includes("viewport-fit=cover") && !mobile.viewport.includes("user-scalable=no"),
    mobile.viewport,
  );
}

console.log("\n--- floating action button ---");
await m.goto(APP + "/transactions", { waitUntil: "networkidle" });
{
  const compactToolbar = await m.locator("[data-transaction-toolbar]").evaluate((toolbar) => ({
    height: toolbar.getBoundingClientRect().height,
    fromVisible: Boolean(document.querySelector('input[name="from"]')),
    detailSelectVisible: Boolean(document.querySelector('select[name="kind"]')),
  }));
  check(
    "toolbar มือถือย่อเหลือไม่เกิน 140px และซ่อน field ที่ยังไม่ใช้",
    compactToolbar.height <= 140 && !compactToolbar.fromVisible && !compactToolbar.detailSelectVisible,
    JSON.stringify(compactToolbar),
  );

  await m.click("[data-open-time-filter]");
  const sheet = await m.locator('[data-filter-panel="time"]').evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    return {
      position: getComputedStyle(panel).position,
      bottom: rect.bottom,
      viewport: innerHeight,
      height: rect.height,
    };
  });
  check(
    "มือถือเปิดช่วงเวลาเป็น bottom sheet สูงไม่เกิน 80dvh",
    sheet.position === "fixed" && Math.abs(sheet.bottom - sheet.viewport) <= 1 && sheet.height <= sheet.viewport * 0.81,
    JSON.stringify(sheet),
  );
  await m.locator("[data-filter-backdrop]").click({ position: { x: 4, y: 4 } });

  await m.click("[data-open-detail-filters]");
  await m.addScriptTag({ content: AXE });
  const sheetAxe = await m.evaluate(async () =>
    await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      exclude: [["nextjs-portal"]],
    }),
  );
  const sheetViolations = sheetAxe.violations.filter((violation) => violation.impact !== "minor");
  check(
    "bottom sheet ตัวกรองผ่าน axe",
    sheetViolations.length === 0,
    sheetViolations.map((violation) => violation.id).join(", ") || "ไม่มี violation",
  );
  await m.locator("[data-filter-backdrop]").click({ position: { x: 4, y: 4 } });

  const fab = await m.evaluate(() => {
    const button = document.querySelector("[data-transaction-fab]");
    const nav = document.querySelector("[data-mobile-nav]");
    const buttonRect = button.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      position: getComputedStyle(button).position,
      width: buttonRect.width,
      height: buttonRect.height,
      bottom: buttonRect.bottom,
      navTop: navRect.top,
    };
  });
  check(
    "FAB เพิ่มรายการลอยเหนือ bottom navigation และกดง่าย",
    fab.position === "fixed" && fab.width >= 44 && fab.height >= 44 && fab.bottom <= fab.navTop - 8,
    JSON.stringify(fab),
  );

  await m.click("[data-transaction-fab]");
  await m.waitForSelector("#add-transaction-form");
  const opened = await m.evaluate(() => ({
    formVisible: document.querySelector("#add-transaction-form")?.getBoundingClientRect().height > 0,
    fabExists: Boolean(document.querySelector("[data-transaction-fab]")),
    position: getComputedStyle(document.querySelector("[data-add-transaction-sheet]")).position,
    bottom: document.querySelector("[data-add-transaction-sheet]").getBoundingClientRect().bottom,
    viewport: innerHeight,
  }));
  check(
    "กด FAB แล้วเปิดฟอร์มเป็น bottom sheet และซ่อนปุ่มลอย",
    opened.formVisible && !opened.fabExists && opened.position === "fixed" && Math.abs(opened.bottom - opened.viewport) <= 1,
    JSON.stringify(opened),
  );

  await m.click("[data-open-amount-calculator]");
  await m.click('[data-calculator-key="clear"]');
  await m.click('[data-calculator-key="1"]');
  await m.click('[data-calculator-key="2"]');
  await m.click('[data-calculator-key="add"]');
  await m.click('[data-calculator-key="3"]');
  await m.click('[data-calculator-key="equals"]');
  const calculated = await m.locator('input[name="amount"]').inputValue();
  check("เครื่องคิดเลขคำนวณ 12 + 3 แล้วใส่ผลกลับช่องจำนวนเงิน", calculated === "15", calculated);

  await m.click("[data-open-amount-calculator]");
  await m.addScriptTag({ content: AXE });
  const transactionSheetAxe = await m.evaluate(async () =>
    await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      exclude: [["nextjs-portal"]],
    }),
  );
  const transactionSheetViolations = transactionSheetAxe.violations.filter((violation) => violation.impact !== "minor");
  check(
    "bottom sheet เพิ่มรายการและเครื่องคิดเลขผ่าน axe",
    transactionSheetViolations.length === 0,
    transactionSheetViolations.map((violation) => violation.id).join(", ") || "ไม่มี violation",
  );
  await m.click("[data-close-amount-calculator]");
  await m.click("[data-close-transaction-form]");
}

await m.goto(`${APP}/transactions?view=calendar&scope=month&at=${P}-15`, { waitUntil: "networkidle" });
{
  const smallDays = await m.locator('[data-calendar-view="month"] a[href*="scope=day"]').evaluateAll((days) =>
    days
      .map((day) => {
        const rect = day.getBoundingClientRect();
        return { label: day.getAttribute("aria-label"), width: rect.width, height: rect.height };
      })
      .filter((day) => day.width < 44 || day.height < 44),
  );
  check(
    "ช่องวันในปฏิทินมี touch target อย่างน้อย 44×44px",
    smallDays.length === 0,
    smallDays.slice(0, 3).map((day) => `${day.label} ${day.width}×${day.height}`).join(" | ") || "ผ่านทุกวัน",
  );
}

for (const path of PAGES) {
  await m.goto(APP + path, { waitUntil: "networkidle" });
  await m.waitForTimeout(500);
  const o = await m.evaluate(() => {
    const de = document.documentElement;
    const wide = [...document.querySelectorAll("*")]
      .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1)
      .map((e) => e.tagName + "." + String(e.className).slice(0, 40));
    return { overflow: de.scrollWidth > de.clientWidth, scrollW: de.scrollWidth, wide: wide.slice(0, 3) };
  });
  check(`360px ${path}`, !o.overflow, o.overflow ? `scrollW=${o.scrollW} ${o.wide.join(" | ")}` : "พอดีจอ");

  await m.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const spacing = await m.evaluate(() => {
    const nav = document.querySelector("[data-mobile-nav]").getBoundingClientRect();
    const last = document.querySelector("main")?.lastElementChild?.getBoundingClientRect();
    return { navTop: nav.top, contentBottom: last?.bottom ?? 0 };
  });
  check(
    `360px ${path} bottom navigation ไม่บังเนื้อหา`,
    spacing.contentBottom <= spacing.navTop,
    `content=${Math.round(spacing.contentBottom)} nav=${Math.round(spacing.navTop)}`,
  );
}
for (const path of PUBLIC_PAGES) {
  await m.goto(APP + path, { waitUntil: "networkidle" });
  await m.waitForTimeout(500);
  const o = await m.evaluate(() => {
    const de = document.documentElement;
    const wide = [...document.querySelectorAll("*")]
      .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1)
      .map((e) => e.tagName + "." + String(e.className).slice(0, 40));
    return { overflow: de.scrollWidth > de.clientWidth, scrollW: de.scrollWidth, wide: wide.slice(0, 3) };
  });
  check(`360px ${path}`, !o.overflow, o.overflow ? `scrollW=${o.scrollW} ${o.wide.join(" | ")}` : "พอดีจอ");
}
{
  const smallFields = await m.evaluate(() =>
    [...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea')]
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => ({ tag: el.tagName, name: el.getAttribute("name"), size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((field) => field.size < 16),
  );
  check(
    "ช่องกรอกบนมือถืออย่างน้อย 16px ไม่กระตุ้น iOS auto-zoom",
    smallFields.length === 0,
    smallFields.map((field) => `${field.tag}[${field.name}] ${field.size}px`).join(" | ") || "ผ่านทุกช่อง",
  );
}
await m.goto(APP + "/", { waitUntil: "networkidle" });
await m.evaluate(() => scrollTo(0, 0));
await m.screenshot({ path: `${OUT}/final-mobile.png`, fullPage: true });
await m.goto(APP + "/profile", { waitUntil: "networkidle" });
await m.screenshot({ path: `${OUT}/final-mobile-profile.png`, fullPage: true });
await m.goto(APP + "/transactions", { waitUntil: "networkidle" });
await m.screenshot({ path: `${OUT}/final-mobile-transactions.png`, fullPage: true });
await m.goto(`${APP}/transactions?view=calendar&scope=month&at=${P}-15`, { waitUntil: "networkidle" });
await m.screenshot({ path: `${OUT}/final-mobile-calendar.png`, fullPage: true });

console.log("\n--- keyboard focus มองเห็นไหม ---");
await page.goto(APP + "/", { waitUntil: "networkidle" });
{
  await page.keyboard.press("Tab");
  const f = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, outline: cs.outlineWidth + " " + cs.outlineStyle + " " + cs.outlineColor };
  });
  check("Tab แรกมี focus ring มองเห็น", f.outline.includes("2px") && !f.outline.includes("none"),
    `${f.tag} → ${f.outline}`);
}

console.log("\n--- หน้าสาธารณะ ---");
{
  // คนแปลกหน้าเปิดหน้าแรกต้องเจอ landing ไม่ใช่ฟอร์ม login
  // ส่วน path ลึกต้องยังเด้งไป login พร้อม next เหมือนเดิม
  const anon = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await anon.goto(APP + "/", { waitUntil: "networkidle" });
  check("ไม่ล็อกอินเปิด / แล้วได้ landing", new URL(anon.url()).pathname === "/welcome", anon.url());
  await anon.goto(APP + "/budgets", { waitUntil: "networkidle" });
  const login = new URL(anon.url());
  check(
    "ไม่ล็อกอินเปิด /budgets ยังเด้งไป login พร้อม next",
    login.pathname === "/login" && login.searchParams.get("next") === "/budgets",
    anon.url(),
  );
  const signupLinks = await anon.goto(APP + "/signup", { waitUntil: "networkidle" }).then(() =>
    anon.evaluate(() =>
      ["/terms", "/privacy"].map((href) => Boolean(document.querySelector(`a[href="${href}"]`))),
    ),
  );
  check("หน้า signup ลิงก์ไป terms + privacy", signupLinks.every(Boolean), signupLinks.join(", "));

  // open redirect — ?next= ที่ชี้ออกนอกโดเมนต้องถูกทิ้ง ตกกลับหน้าแรก
  // "//evil.com" คือ URL แบบ protocol-relative ที่ผ่านการเช็ค startsWith("/") ทั่วไป
  await anon.goto(APP + "/login?next=//evil.com/", { waitUntil: "networkidle" });
  await anon.fill("#email", email);
  await anon.fill("#password", PW);
  await anon.click("button[type=submit]");
  await anon.waitForURL((u) => u.pathname !== "/login", { timeout: 20000 });
  const landed = new URL(anon.url());
  check(
    "next=//evil.com ถูกทิ้ง ไม่พาออกนอกโดเมน",
    landed.origin === new URL(APP).origin && landed.pathname === "/",
    anon.url(),
  );
  await anon.close();

  // ส่วน next ที่เป็น path ภายในจริงต้องยังทำงาน — เด้งกลับหน้าที่ตั้งใจไป
  const anon2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await anon2.goto(APP + "/login?next=/budgets", { waitUntil: "networkidle" });
  await anon2.fill("#email", email);
  await anon2.fill("#password", PW);
  await anon2.click("button[type=submit]");
  await anon2.waitForURL(APP + "/budgets", { timeout: 20000 });
  check("next=/budgets พาไปหน้าที่ตั้งใจหลังล็อกอิน", true, anon2.url());
  await anon2.close();
}

console.log("\n--- security headers ---");
{
  const res = await fetch(APP + "/welcome");
  const h = (name) => res.headers.get(name) ?? "";
  const csp = h("content-security-policy");
  check("มี Content-Security-Policy", csp.length > 0);
  check(
    "CSP ปิดทางฝัง iframe + object + base + form ออกนอก",
    csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'")
      && csp.includes("base-uri 'self'") && csp.includes("form-action 'self'"),
    csp.slice(0, 120),
  );
  check("X-Content-Type-Options: nosniff", h("x-content-type-options") === "nosniff", h("x-content-type-options"));
  check("Referrer-Policy จำกัดการรั่วของ URL", h("referrer-policy") === "strict-origin-when-cross-origin", h("referrer-policy"));
  check("Permissions-Policy ปิด API ที่ไม่ใช้", h("permissions-policy").includes("camera=()"), h("permissions-policy"));
  check("HSTS พร้อมสำหรับ production", h("strict-transport-security").includes("max-age="), h("strict-transport-security"));
}

console.log("\n--- prefers-reduced-motion ---");
{
  const rm = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await rm.emulateMedia({ reducedMotion: "reduce" });
  await rm.goto(`${APP}/login`, { waitUntil: "networkidle" });
  const anim = await rm.evaluate(() => {
    const el = document.querySelector(".hero-card");
    return el ? getComputedStyle(el, "::before").animationName : "no-hero";
  });
  check("reduced-motion หยุด sweep", anim === "none" || anim === "no-hero", String(anim));
}

await page.goto(APP + "/analytics", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/final-analytics.png`, fullPage: true });
await page.goto(APP + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/final-dashboard.png` });

console.log(`\n${fail === 0 ? "GATE ผ่าน" : "GATE ไม่ผ่าน"} — pass ${pass} / fail ${fail}`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);

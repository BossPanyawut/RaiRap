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

const PAGES = ["/", "/transactions", "/budgets", "/analytics", "/categories"];

console.log("--- axe-core (wcag2a + wcag2aa) ---");
for (const path of PAGES) {
  await page.goto(APP + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () =>
    await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      // ตัว dev overlay ของ Next ไม่ใช่โค้ดเรา
      exclude: [["nextjs-portal"]],
    }),
  );
  const v = r.violations.filter((x) => x.impact !== "minor");
  check(`axe ${path}`, v.length === 0,
    v.length ? v.map((x) => `${x.id}(${x.impact}) x${x.nodes.length}`).join(", ") : "ไม่มี violation");
}

console.log("\n--- 360px ไม่ล้นแนวนอน ---");
const m = await browser.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 });
await m.goto(`${APP}/login`);
await m.fill("#email", email);
await m.fill("#password", PW);
await m.click("button[type=submit]");
await m.waitForURL(APP + "/", { timeout: 20000 });
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
}
await m.screenshot({ path: `${OUT}/final-mobile.png`, fullPage: true });

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

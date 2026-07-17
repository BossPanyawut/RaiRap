/**
 * lib/env.ts เป็นด่านแรกที่กันคนตั้งค่าผิด ถ้ามันพังจะพังเงียบ ๆ
 * (แอปยิง cloud ด้วย key ของเครื่อง แล้วบอกแค่ "table not found")
 *
 * ทดสอบด้วยการ spawn จริง เพราะ lib/env.ts อ่าน process.env ตอน import
 * โมดูลถูก cache หลัง import ครั้งแรก จะเปลี่ยน env แล้ว import ซ้ำในโปรเซสเดียวไม่ได้
 */
import { spawnSync } from "node:child_process";

const LOCAL_DEMO =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.x";
const LEGACY_CLOUD =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYyIsInJvbGUiOiJhbm9uIn0.x";
const PUBLISHABLE = "sb_publishable_abcdefghijklmnop";

let pass = 0;
let fail = 0;
const check = (n, ok, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
  if (ok) { pass++; } else { fail++; }
};

function load(url, keyName, keyValue) {
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url };
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (keyName) env[keyName] = keyValue;

  const r = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "-e",
      'import("./lib/env.ts").then((m)=>console.log("OK:"+m.env.NEXT_PUBLIC_SUPABASE_KEY)).catch((e)=>console.log("THROW:"+String(e.message).split("\\n")[0]))',
    ],
    { env, encoding: "utf8", cwd: new URL("..", import.meta.url).pathname },
  );
  // เอาเฉพาะบรรทัดผลลัพธ์ — Node ยิง warning ลง stderr ปนมาด้วย
  return (
    (r.stdout + r.stderr)
      .split("\n")
      .find((l) => l.startsWith("OK:") || l.startsWith("THROW:")) ?? "ไม่มีผลลัพธ์"
  );
}

const ANON = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const PUB = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
const CLOUD = "https://abc.supabase.co";
const LOCAL = "http://127.0.0.1:54321";

console.log("--- คู่ที่ถูกต้อง ต้องผ่าน ---");
check("cloud URL + publishable key", load(CLOUD, PUB, PUBLISHABLE).startsWith("OK"));
check("cloud URL + legacy anon JWT", load(CLOUD, ANON, LEGACY_CLOUD).startsWith("OK"));
check("local URL + local demo key", load(LOCAL, ANON, LOCAL_DEMO).startsWith("OK"));
check("localhost ก็นับเป็น local", load("http://localhost:54321", ANON, LOCAL_DEMO).startsWith("OK"));

console.log("\n--- คู่ที่ปนกัน ต้องหยุดทันที ---");
// เคสจริงที่เคยเกิด: .env.local มีทั้งของเครื่องและของ cloud ปนกัน
check("cloud URL + key ของเครื่อง", load(CLOUD, ANON, LOCAL_DEMO).startsWith("THROW"),
  load(CLOUD, ANON, LOCAL_DEMO).slice(0, 46));
check("local URL + key ของ cloud", load(LOCAL, PUB, PUBLISHABLE).startsWith("THROW"));

console.log("\n--- ค่าไม่ครบ ---");
check("ไม่มี key เลย", load(CLOUD, null, null).startsWith("THROW"));
check("URL ไม่ใช่ URL", load("ไม่ใช่ url", PUB, PUBLISHABLE).startsWith("THROW"));

console.log("\n--- publishable ชนะ anon ถ้ามีทั้งคู่ ---");
{
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: CLOUD };
  env[PUB] = PUBLISHABLE;
  env[ANON] = LEGACY_CLOUD;
  const r = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "-e",
      'import("./lib/env.ts").then((m)=>console.log("OK:"+m.env.NEXT_PUBLIC_SUPABASE_KEY)).catch((e)=>console.log("THROW"))',
    ],
    { env, encoding: "utf8", cwd: new URL("..", import.meta.url).pathname },
  );
  const out =
    (r.stdout + r.stderr)
      .split("\n")
      .find((l) => l.startsWith("OK:") || l.startsWith("THROW")) ?? "ไม่มีผลลัพธ์";
  check("มีทั้งสองชื่อ → ใช้ publishable", out === `OK:${PUBLISHABLE}`, out.slice(0, 40));
}

console.log(`\n${fail === 0 ? "GATE ผ่าน" : "GATE ไม่ผ่าน"} — pass ${pass} / fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);

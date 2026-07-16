/**
 * gate script สร้างผู้ใช้ทิ้ง ๆ และลบ transactions ด้วย service_role ซึ่ง bypass RLS
 * ถ้าใครเผลอชี้ไป Supabase ตัวจริง มันจะลบข้อมูลผู้ใช้จริง
 * ไฟล์นี้บังคับว่าต้องเป็น Supabase ในเครื่องเท่านั้น ไม่มีทางเลี่ยง
 */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** key ของ Supabase local — Supabase ประกาศไว้ในเอกสาร เหมือนกันทุกเครื่อง ไม่ใช่ความลับ
 *  (iss: "supabase-demo") ใช้กับ production ไม่ได้อยู่แล้ว */
const LOCAL_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function localSupabase() {
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";

  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`SUPABASE_URL ไม่ใช่ URL ที่ถูกต้อง: ${url}`);
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `gate รันได้เฉพาะ Supabase ในเครื่อง แต่ SUPABASE_URL ชี้ไป "${host}"\n` +
        `script นี้ลบ transactions ด้วย service_role ซึ่งข้าม RLS — ถ้ารันกับ project จริง ข้อมูลผู้ใช้จะหาย\n` +
        `รัน "npx supabase start" แล้วปล่อย SUPABASE_URL ว่างไว้`,
    );
  }

  return {
    url,
    anon: process.env.SUPABASE_ANON_KEY ?? LOCAL_ANON,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_SERVICE,
    app: process.env.APP_URL ?? "http://localhost:3000",
  };
}

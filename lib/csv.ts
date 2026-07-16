import { z } from "zod";

export const CSV_HEADERS = [
  "วันที่",
  "ประเภท",
  "หมวดหมู่",
  "จำนวนเงิน",
  "บันทึกย่อ",
] as const;

/**
 * ครอบค่าที่มี , " หรือขึ้นบรรทัดใหม่ ตาม RFC 4180
 * ถ้าไม่ครอบ บันทึกย่อที่มีลูกน้ำ (เช่น "ข้าว, น้ำ") จะดันคอลัมน์เพี้ยนทั้งแถว
 */
function escapeCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

export type ExportRow = {
  occurred_on: string;
  kind: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
};

export function toCSV(rows: ExportRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.occurred_on,
        r.kind === "income" ? "รายรับ" : "รายจ่าย",
        escapeCell(r.category),
        // เขียนตัวเลขดิบ ไม่คั่นหลักพัน ไม่ใส่สัญลักษณ์สกุลเงิน — ไฟล์นี้มีไว้ให้
        // เครื่องอ่านกลับเข้ามาได้ ถ้าใส่ "฿ 1,234.50" จะ parse กลับไม่ได้
        r.amount.toFixed(2),
        escapeCell(r.note ?? ""),
      ].join(","),
    );
  }
  // BOM — ไม่มีอันนี้ Excel บน Windows อ่านภาษาไทยเป็นขยะ
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** แยกบรรทัด CSV โดยเคารพเครื่องหมายคำพูด */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export type ParsedRow = {
  line: number;
  occurred_on: string;
  kind: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
};

export type ParseResult = { rows: ParsedRow[]; errors: string[] };

const isoDate = z.iso.date();

export function parseCSV(text: string): ParseResult {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  if (lines.length === 0) return { rows, errors: ["ไฟล์ว่าง"] };

  const header = splitLine(lines[0]).map((h) => h.trim());
  if (header[0] !== CSV_HEADERS[0]) {
    errors.push(
      `หัวตารางไม่ตรง แถวแรกต้องเป็น: ${CSV_HEADERS.join(", ")}`,
    );
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const n = i + 1;
    const c = splitLine(lines[i]).map((v) => v.trim());
    if (c.length < 4) {
      errors.push(`แถว ${n}: มีไม่ครบ 4 คอลัมน์`);
      continue;
    }

    const [date, kindTH, category, amountRaw, note] = c;

    // ต้องตรวจว่าเป็นวันที่จริง ไม่ใช่แค่รูปทรงถูก — "2026-13-99" ผ่าน
    // regex \d{4}-\d{2}-\d{2} สบาย ๆ แล้วไปพังตอน insert ทำให้ทั้งไฟล์ล้ม
    // พร้อมข้อความรวม ๆ ที่ไม่บอกว่าแถวไหน
    if (!isoDate.safeParse(date).success) {
      errors.push(`แถว ${n}: วันที่ "${date}" ไม่ใช่วันที่ที่มีอยู่จริง (ต้องเป็น ปปปป-ดด-วว)`);
      continue;
    }
    const kind = kindTH === "รายรับ" ? "income" : kindTH === "รายจ่าย" ? "expense" : null;
    if (!kind) {
      errors.push(`แถว ${n}: ประเภท "${kindTH}" ต้องเป็น รายรับ หรือ รายจ่าย`);
      continue;
    }
    if (!category) {
      errors.push(`แถว ${n}: ไม่มีชื่อหมวดหมู่`);
      continue;
    }
    // ยอมรับทั้ง "1234.50" และ "1,234.50" ที่ Excel ชอบใส่ให้
    const amount = Number(amountRaw.replaceAll(",", ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`แถว ${n}: จำนวนเงิน "${amountRaw}" ต้องเป็นตัวเลขมากกว่า 0`);
      continue;
    }

    rows.push({
      line: n,
      occurred_on: date,
      kind,
      category,
      amount: Math.round(amount * 100) / 100,
      note: note || null,
    });
  }

  return { rows, errors };
}

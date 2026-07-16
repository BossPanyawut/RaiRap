/**
 * spec §9 — หน้าจอว่างคือคำเชิญให้ลงมือ ไม่ใช่ที่ระบายอารมณ์
 * ข้อความบอกว่าทำอะไรได้ต่อ ไม่ใช่บอกว่าไม่มีอะไร
 */
export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <p className="text-text-muted text-[15px]">{title}</p>
      {action}
    </div>
  );
}

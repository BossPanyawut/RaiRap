import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary";

// spec §7 — หลัก: พื้น accent-primary ตัวอักษรขาว hover เงาขยาย
//           รอง: กระจกใส ขอบจาง ตัวอักษร accent-deep
// ไม่ใช้ utility .glass เพราะมันตรึง radius 24px และ blur(20px) หนักเกินสำหรับปุ่มเล็ก
// focus ring มาจาก :focus-visible ใน globals.css (spec §8)
const variants: Record<Variant, string> = {
  primary:
    "bg-accent-primary-strong text-white shadow-[0_4px_14px_rgb(46_127_224/0.30)] hover:shadow-[0_8px_24px_rgb(46_127_224/0.40)]",
  secondary:
    "border border-glass-border bg-input text-link backdrop-blur-[12px] hover:bg-hover",
};

function buttonClass(variant: Variant, className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium whitespace-nowrap",
    // spec §8 — 400ms ease-in-out ไม่เร่งรีบ
    "transition-all duration-400 ease-in-out",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

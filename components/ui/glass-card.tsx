import { cn } from "@/lib/cn";

export function GlassCard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("glass p-6", className)} {...props} />;
}

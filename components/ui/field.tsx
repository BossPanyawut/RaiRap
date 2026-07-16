import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  className,
  id,
  ...props
}: React.ComponentProps<"input"> & { label: string; hint?: string }) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={cn(
          "border-glass-border rounded-2xl border bg-input px-4 py-2.5 text-[15px]",
          "placeholder:text-text-muted/70",
          "transition-colors duration-400 ease-in-out",
          "focus:bg-input-focus",
          className,
        )}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-text-muted text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}

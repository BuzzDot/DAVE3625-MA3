import { cn } from "@/lib/utils";
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "rounded-2xl border border-border bg-white p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

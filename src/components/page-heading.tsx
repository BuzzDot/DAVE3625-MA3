import Link from "next/link";
import { ChevronRight } from "lucide-react";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
export function SectionTitle({
  title,
  href,
  label = "View all",
}: {
  title: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
      >
        {label}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  LayoutDashboard,
  Leaf,
  Settings,
  Sprout,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
const navigation = [
  ["Dashboard", "/", LayoutDashboard],
  ["Workouts", "/workouts", Dumbbell],
  ["Nutrition", "/nutrition", Leaf],
  ["Health", "/health", Activity],
  ["Calendar", "/calendar", CalendarDays],
  ["Progress", "/progress", ChartNoAxesCombined],
  ["Community", "/community", Users],
] as const;
export function AppShell({
  children,
  userEmail,
  configured,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  configured: boolean;
}) {
  const pathname = usePathname();
  const demo =
    pathname.startsWith("/demo/") || ["/community"].includes(pathname);
  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" aria-label="Form home" className="brand">
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          form<span className="text-primary">.</span>
        </Link>
        <div className="mt-12 px-4 text-[10px] font-bold tracking-[.18em] text-muted-foreground">
          YOUR SPACE
        </div>
        <nav aria-label="Main navigation" className="mt-4 space-y-1">
          {navigation.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn("nav-link", pathname === href && "active")}
            >
              <Icon size={19} strokeWidth={1.7} />
              {label}
              {label === "Community" && (
                <span className="ml-auto text-[9px] tracking-wide opacity-70">
                  SOON
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="rounded-2xl bg-[#edf1e8] p-5">
            <Sprout className="mb-3 text-primary" size={25} />
            <p className="font-semibold text-sm">A little better, every day.</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Small steps. Lasting habits. Your journey, at your pace.
            </p>
            <Link
              href="/progress"
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary"
            >
              See your progress <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link
            href="/settings"
            className={cn(
              "nav-link mt-5",
              pathname === "/settings" && "active",
            )}
          >
            <Settings size={19} />
            Settings
          </Link>
          <div className="mt-4 flex items-center gap-3 border-t border-border px-2 pt-5">
            <div className="avatar">
              {userEmail
                ? userEmail.slice(0, 2).toUpperCase()
                : demo
                  ? "JD"
                  : "F"}
            </div>
            <div>
              <p className="max-w-32 truncate text-sm font-semibold">
                {userEmail?.split("@")[0] ??
                  (demo ? "Jamie Davis" : "Your diary")}
              </p>
              <p className="text-xs text-muted-foreground">
                {userEmail ? (
                  "Private account"
                ) : demo ? (
                  "Demo profile"
                ) : (
                  <Link href="/login" className="underline">
                    Log in
                  </Link>
                )}
              </p>
            </div>
            <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span className="text-sm text-muted-foreground">
            Your everyday,{" "}
            <span className="font-medium text-foreground">stronger.</span>
          </span>
          <span className="demo-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {demo
              ? "DEMO WORKSPACE"
              : userEmail
                ? "PRIVATE WORKSPACE"
                : configured
                  ? "ACCOUNT ACCESS"
                  : "SETUP NEEDED"}
          </span>
        </header>
        <nav aria-label="Mobile navigation" className="mobile-nav">
          {navigation.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-3 text-xs",
                pathname === href && "bg-secondary text-primary",
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
          <Link href="/settings" className="px-3 py-3 text-xs">
            Settings
          </Link>
        </nav>
        <main id="main" className="page-content">
          {children}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-[11px] text-muted-foreground">
            <span>Form · Make room for a healthier you.</span>
            <span>
              {demo
                ? "Demo preview · Fictional data"
                : userEmail
                  ? "Private fitness diary · Your account’s data"
                  : "Connect Supabase to use your private diary"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/lib/auth";
import "./globals.css";
// Never prerender a private workspace with build-time auth/configuration state.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Form — Your everyday, stronger", template: "%s · Form" },
  description:
    "Your private fitness diary: workouts, nutrition, health measurements, calendar planning and progress.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  return (
    <html lang="en">
      <body>
        <AppShell
          userEmail={viewer.user?.email ?? null}
          configured={viewer.status !== "unconfigured"}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}

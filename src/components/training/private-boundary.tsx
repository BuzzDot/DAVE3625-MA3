import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { SetupNotice } from "@/components/setup-notice";
export async function PrivateBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (viewer.status === "unconfigured" || viewer.status === "unavailable")
    return <SetupNotice unavailable={viewer.status === "unavailable"} />;
  if (!viewer.user) redirect("/login");
  return children;
}

import { DashboardContent } from "@/components/diary/pages";
import { PrivateBoundary } from "@/components/training/private-boundary";
export default function Page() {
  return (
    <PrivateBoundary>
      <DashboardContent />
    </PrivateBoundary>
  );
}

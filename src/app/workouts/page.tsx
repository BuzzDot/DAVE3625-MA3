import { PrivateBoundary } from "@/components/training/private-boundary";
import { loadTrainingData } from "@/lib/training/repository";
import { TrainingWorkspace } from "@/components/training/workspace";
async function Content() {
  return <TrainingWorkspace data={await loadTrainingData()} />;
}
export default function Page() {
  return (
    <PrivateBoundary>
      <Content />
    </PrivateBoundary>
  );
}

import { PrivateBoundary } from "@/components/training/private-boundary";
import { loadTrainingData } from "@/lib/training/repository";
import { TrainingProgress } from "@/components/training/progress";
async function Content() {
  return <TrainingProgress data={await loadTrainingData()} />;
}
export default function Page() {
  return (
    <PrivateBoundary>
      <Content />
    </PrivateBoundary>
  );
}

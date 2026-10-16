import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function SetupNotice({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  return (
    <Card className="mx-auto max-w-2xl">
      <p className="eyebrow">PRIVATE WORKOUT DIARY</p>
      <h1>
        {unavailable
          ? "Connection needs attention."
          : "Connect your training space."}
      </h1>
      <p className="my-5 text-sm leading-relaxed text-muted-foreground">
        {unavailable
          ? "The authentication service could not be reached. Your private records have not been replaced with demo data. Check the service configuration and retry."
          : "The persistent workout diary needs Supabase authentication and a migrated database. No account or connection is configured in this workspace yet."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/setup">Setup instructions</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/demo/workouts">Explore the workout demo</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/demo/logger">Try logging controls</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </Card>
  );
}

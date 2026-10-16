import { getViewer } from "@/lib/auth";
import { LogoutButton } from "@/components/auth-form";
import { PrivateBoundary } from "@/components/training/private-boundary";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkError } from "@/lib/training/repository";
import { TimezoneForm } from "@/components/diary/timezone";
async function Content() {
  const viewer = await getViewer();
  const client = await createSupabaseServerClient();
  const profile = await client
    .from("profiles")
    .select("timezone")
    .eq("id", viewer.user!.id)
    .maybeSingle();
  checkError(profile.error);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PRIVATE SPACE"
        title="Make yourself at home."
        description="Your account and training preferences."
      />
      <Card>
        <h2 className="mb-5 font-semibold">Account & privacy</h2>
        <p className="mb-4 text-sm">
          Signed in as{" "}
          <strong className="break-all">{viewer.user?.email}</strong>
        </p>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Your workouts, nutrition, health diary and calendar belong to your
          private account and persist in Supabase. Measurements use metric
          units. Community remains a demo preview. Every record retains its
          original timezone.
        </p>
        <TimezoneForm timezone={profile.data?.timezone ?? "Europe/Oslo"} />
        <LogoutButton userId={viewer.user!.id} />
        <p className="mt-6 text-xs text-muted-foreground">
          Profile editing, password recovery, export, and account deletion
          remain planned. Public program retention must be resolved before
          account deletion is enabled.
        </p>
      </Card>
    </>
  );
}
export default function Page() {
  return (
    <PrivateBoundary>
      <Content />
    </PrivateBoundary>
  );
}

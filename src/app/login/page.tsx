import { AuthForm } from "@/components/auth-form";
import { supabaseConfigured } from "@/lib/supabase/config";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const query = await searchParams;
  return (
    <AuthForm
      mode="login"
      configured={supabaseConfigured()}
      confirmationFailed={query.confirmation === "failed"}
      confirmationReceived={query.confirmation === "received"}
    />
  );
}

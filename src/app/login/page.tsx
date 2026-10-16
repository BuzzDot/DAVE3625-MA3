import { AuthForm } from "@/components/auth-form";
import { supabaseConfigured } from "@/lib/supabase/config";
import {
  confirmationMessage,
  type ConfirmationStatus,
} from "@/lib/confirmation";
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
      confirmationFeedback={
        query.confirmation
          ? confirmationMessage(
              (["expired", "invalid", "unavailable", "browser"].includes(
                query.confirmation,
              )
                ? query.confirmation
                : "invalid") as ConfirmationStatus,
            )
          : undefined
      }
    />
  );
}

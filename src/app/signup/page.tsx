import { AuthForm } from "@/components/auth-form";
import { supabaseConfigured } from "@/lib/supabase/config";
export default function Page() {
  return <AuthForm mode="signup" configured={supabaseConfigured()} />;
}

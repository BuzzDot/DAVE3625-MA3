import Link from "next/link";
import { Card } from "@/components/ui/card";
export default function Page() {
  return (
    <Card className="mx-auto max-w-3xl">
      <p className="eyebrow">ONE-TIME CONFIGURATION</p>
      <h1>Make room for your real progress.</h1>
      <ol className="mt-6 list-decimal space-y-5 pl-5 text-sm leading-relaxed">
        <li>
          Start Docker Desktop and run <code>npx supabase start</code>, or
          create a Supabase project.
        </li>
        <li>
          Apply all migrations in <code>supabase/migrations</code> in order. See{" "}
          <code>docs/SETUP.md</code> for safe local and hosted instructions.
        </li>
        <li>
          Copy <code>.env.example</code> to <code>.env.local</code>. Set the
          Supabase URL, publishable key, and your application’s site URL.
        </li>
        <li>
          Configure the auth redirect URL to{" "}
          <code>your-site/auth/callback</code>, enable email confirmation, and
          restart the application.
        </li>
        <li>
          <Link className="text-primary underline" href="/signup">
            Create an account
          </Link>
          , confirm your email, and log in. Your workout library and diary will
          use your own private database records.
        </li>
      </ol>
      <p className="mt-7 text-xs text-muted-foreground">
        Only a public publishable key is used by the application. Never use a
        service-role or secret key here. Until configuration is complete,
        private features stay unavailable and demo pages stay explicitly
        fictional.
      </p>
    </Card>
  );
}

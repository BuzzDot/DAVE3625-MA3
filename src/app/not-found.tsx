import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-semibold">A little off track.</h1>
      <p className="my-4 text-muted-foreground">This page doesn’t exist.</p>
      <Link href="/" className="text-primary underline">
        Back to your dashboard
      </Link>
    </div>
  );
}

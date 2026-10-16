"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1>Let’s take a breath.</h1>
      <p className="my-5 text-sm text-muted-foreground">
        This page couldn’t load. You can try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

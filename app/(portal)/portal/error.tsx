"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[portal error boundary]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <GlassPanel className="max-w-md p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This page couldn&apos;t load. Please try again, or contact your branch if it keeps happening.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/portal">Back to dashboard</Link>
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}

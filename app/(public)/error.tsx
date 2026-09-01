"use client";

import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[public error boundary]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="app-backdrop flex min-h-screen items-center justify-center p-6">
      <GlassPanel strong className="w-full max-w-sm p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted-foreground">This page couldn&apos;t load. Please try again.</p>
        <Button className="w-full" onClick={() => reset()}>
          Try again
        </Button>
      </GlassPanel>
    </div>
  );
}

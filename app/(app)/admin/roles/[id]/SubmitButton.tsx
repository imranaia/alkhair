"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-brand text-brand-foreground hover:bg-brand/90">
      {pending ? "Saving…" : "Save permissions"}
    </Button>
  );
}

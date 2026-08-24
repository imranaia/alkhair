"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { applyForLoanAction, type ApplyLoanState } from "./portalActions";

const initialState: ApplyLoanState = { error: null };

export function ApplyLoanDialog({
  clientId,
  fullName,
  clientCode,
  phone,
  businessType,
}: {
  clientId: number;
  fullName: string;
  clientCode: string;
  phone: string | null;
  businessType: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ApplyLoanState, formData: FormData) => {
    const result = await applyForLoanAction(prev, formData);
    if (!result.error) {
      toast.success("Loan application submitted for approval.");
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
          Apply for principal
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply for a new principal</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />

          <div className="glass-panel space-y-1 p-3 text-sm">
            <p className="font-medium">
              {fullName} <span className="text-xs text-muted-foreground">{clientCode}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {phone || "No phone on file"} &middot; {businessType || "No trade on file"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amountRequested">Amount requested (₦)</Label>
            <Input id="amountRequested" name="amountRequested" type="number" min="1" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenureWeeksRequested">Preferred tenure (weeks)</Label>
            <Input id="tenureWeeksRequested" name="tenureWeeksRequested" type="number" min="1" step="1" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purpose">What is it for?</Label>
            <Textarea id="purpose" name="purpose" rows={3} maxLength={500} required />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Submitting…" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

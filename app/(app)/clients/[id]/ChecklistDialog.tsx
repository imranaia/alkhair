"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createChecklistAction, type ChecklistFormState } from "./portalActions";

const initialState: ChecklistFormState = { error: null };

function CheckRow({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 text-sm">
      <Checkbox name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

export function ChecklistDialog({ clientId }: { clientId: number }) {
  const [open, setOpen] = useState(false);
  const [clientType, setClientType] = useState<"new" | "returning">("new");
  const [state, formAction, pending] = useActionState(async (prev: ChecklistFormState, formData: FormData) => {
    const result = await createChecklistAction(prev, formData);
    if (!result.error) {
      toast.success("Pre-disbursement checklist saved.");
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Pre-disbursement checklist
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto border-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pre-disbursement checklist</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="clientType" value={clientType} />

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">KYC</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nickname">Nickname</Label>
                <Input id="nickname" name="nickname" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nin">NIN</Label>
                <Input id="nin" name="nin" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="neighborRelativePhone">Neighbor&apos;s / relative&apos;s phone</Label>
              <Input id="neighborRelativePhone" name="neighborRelativePhone" />
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Shop verification</p>
            <CheckRow name="shopOwner" label="Shop owner" />
            <CheckRow name="rentingShop" label="Renting a shop" />
            <CheckRow name="gpsPhotoVerified" label="GPS photo of shop verified" />
            <CheckRow name="gpsTimeVerified" label="GPS time of shop verified" />
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Amounts</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amountApplied">Applied (₦)</Label>
                <Input id="amountApplied" name="amountApplied" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recommendedAmount">Recommended (₦)</Label>
                <Input id="recommendedAmount" name="recommendedAmount" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amountApproved">Approved (₦)</Label>
                <Input id="amountApproved" name="amountApproved" type="number" min="0" step="0.01" />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Client profile</p>
            <div className="space-y-1.5">
              <Label htmlFor="clientTypeSelect">New or returning</Label>
              <Select value={clientType} onValueChange={(v) => setClientType(v as "new" | "returning")}>
                <SelectTrigger id="clientTypeSelect" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New client</SelectItem>
                  <SelectItem value="returning">Returning client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="preferredTenureMonths">Preferred tenure (months)</Label>
                <Input id="preferredTenureMonths" name="preferredTenureMonths" type="number" min="1" step="1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="experienceYears">Business experience (years)</Label>
                <Input id="experienceYears" name="experienceYears" type="number" min="0" step="1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="typeOfBusiness">Type of business</Label>
              <Input id="typeOfBusiness" name="typeOfBusiness" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerTypeSelect">Type of customer</Label>
              <Select name="customerType" defaultValue="walk_in">
                <SelectTrigger id="customerTypeSelect" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Application checks</p>
            <CheckRow name="applicationFormFilled" label="Loan application form filled" />
            <CheckRow name="appraisalReportAttached" label="Appraisal report attached" />
            <CheckRow name="stockAvailabilityChecked" label="Stock availability & valuation checked" />
            {clientType === "returning" && (
              <>
                <CheckRow name="supervisionReportAttached" label="Supervision report attached" />
                <CheckRow name="loanAmountReviewed" label="Principal amount reviewed" />
              </>
            )}
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <Label htmlFor="bankDetails">Bank details</Label>
            <Input id="bankDetails" name="bankDetails" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="officerName">Officer name</Label>
            <Input id="officerName" name="officerName" required />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Saving…" : "Save checklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

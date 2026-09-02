"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClientAction, type ClientFormState } from "../actions";

function CheckRow({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2.5 py-1 text-sm">
      <Checkbox name={name} />
      {label}
    </label>
  );
}

const initialState: ClientFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ClientForm({
  branches,
  collectorsByBranch,
  showBranchSelect,
  defaultBranchId,
}: {
  branches: { id: number; name: string; code: string }[];
  collectorsByBranch: Record<number, { id: number; fullName: string }[]>;
  showBranchSelect: boolean;
  defaultBranchId?: number;
}) {
  const [state, formAction, pending] = useActionState(createClientAction, initialState);
  const [branchId, setBranchId] = useState<string>(defaultBranchId ? String(defaultBranchId) : "");

  const collectors = branchId ? (collectorsByBranch[Number(branchId)] ?? []) : [];

  return (
    <form action={formAction} className="space-y-4">
      {showBranchSelect && (
        <div className="space-y-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select name="branchId" value={branchId} onValueChange={setBranchId} required>
            <SelectTrigger id="branchId" className="w-full">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nickname">Nickname</Label>
        <Input id="nickname" name="nickname" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" name="email" type="email" placeholder="For account and loan notifications" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="landmark">Landmark</Label>
        <Input id="landmark" name="landmark" placeholder="e.g. Opposite First Bank" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nin">NIN</Label>
          <Input id="nin" name="nin" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="neighborRelativePhone">Neighbor&apos;s / relative&apos;s phone</Label>
          <Input id="neighborRelativePhone" name="neighborRelativePhone" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="groupName">Group</Label>
        <Input id="groupName" name="groupName" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="businessType">Trade / business</Label>
        <Input id="businessType" name="businessType" placeholder="e.g. Provisions, Food Stuff" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="businessLocation">Business location</Label>
        <Input id="businessLocation" name="businessLocation" placeholder="e.g. Kubwa Village" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="experienceYears">Experience in business (years)</Label>
          <Input id="experienceYears" name="experienceYears" type="number" min="0" step="1" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customerType">Type of customer</Label>
          <Select name="customerType" defaultValue="walk_in" required>
            <SelectTrigger id="customerType" className="w-full">
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
        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Shop verification</p>
        <CheckRow name="shopOwner" label="Shop owner" />
        <CheckRow name="rentingShop" label="Renting a shop" />
        <CheckRow name="gpsPhotoVerified" label="GPS photo of shop verified" />
        <CheckRow name="gpsTimeVerified" label="GPS time of shop verified" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enrollmentDate">Enrollment date</Label>
        <Input id="enrollmentDate" name="enrollmentDate" type="date" defaultValue={today()} required />
      </div>

      {collectors.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="loanCollectorId">Collections officer (optional)</Label>
          <Select name="loanCollectorId" key={branchId}>
            <SelectTrigger id="loanCollectorId" className="w-full">
              <SelectValue placeholder="Assign later" />
            </SelectTrigger>
            <SelectContent>
              {collectors.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="openingSavings">Opening savings balance (optional)</Label>
        <Input id="openingSavings" name="openingSavings" type="number" min="0" step="0.01" />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {pending ? "Creating…" : "Create client"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "./new/ClientForm";

export function NewClientDialog({
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
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add Client
      </Button>
      <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto border-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
        </DialogHeader>
        <ClientForm
          branches={branches}
          collectorsByBranch={collectorsByBranch}
          showBranchSelect={showBranchSelect}
          defaultBranchId={defaultBranchId}
        />
      </DialogContent>
    </Dialog>
  );
}

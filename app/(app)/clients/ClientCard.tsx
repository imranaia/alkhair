"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, ArrowUpRight } from "lucide-react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateClientAction, type ClientFormState } from "./actions";
import { ClientStatusControl } from "./[id]/ClientStatusControl";

const initialState: ClientFormState = { error: null };

export type ClientRow = {
  id: number;
  clientCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  landmark: string | null;
  groupName: string | null;
  businessType: string | null;
  businessLocation: string | null;
  status: string;
  branchId: number;
  branchName: string;
  enrollmentDate: string;
  loanCollectorId: number | null;
  loanCollectorName: string | null;
};

export function ClientCard({
  client,
  canEdit,
  collectors,
}: {
  client: ClientRow;
  canEdit: boolean;
  collectors: { id: number; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateClientAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success(state.submitted ? "Submitted for admin approval." : "Client updated.");
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setEditing(false);
      }}
    >
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1.5 p-3 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{client.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{client.clientCode}</p>
          <Badge variant={client.status === "active" ? "default" : "secondary"} className="w-fit capitalize">
            {client.status}
          </Badge>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {client.fullName}
            <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
              {client.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Client code</dt>
                <dd className="font-medium">{client.clientCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Branch</dt>
                <dd className="font-medium">{client.branchName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium">{client.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium">{client.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Group</dt>
                <dd className="font-medium">{client.groupName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Enrollment date</dt>
                <dd className="font-medium">{client.enrollmentDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Collections officer</dt>
                <dd className="font-medium">{client.loanCollectorName || "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Trade / business</dt>
                <dd className="font-medium">{client.businessType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Business location</dt>
                <dd className="font-medium">{client.businessLocation || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd className="font-medium">{client.address || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Landmark</dt>
                <dd className="font-medium">{client.landmark || "—"}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {canEdit && (
                <>
                  <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <ClientStatusControl clientId={client.id} status={client.status} />
                </>
              )}
              <Button asChild variant="ghost" size="sm" className="ml-auto gap-1">
                <Link href={`/clients/${client.id}`}>
                  Full transaction history
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="clientId" value={client.id} />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`fullName-${client.id}`}>Full name</Label>
                <Input id={`fullName-${client.id}`} name="fullName" defaultValue={client.fullName} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`phone-${client.id}`}>Phone</Label>
                <Input id={`phone-${client.id}`} name="phone" defaultValue={client.phone ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`email-${client.id}`}>Email</Label>
                <Input id={`email-${client.id}`} name="email" type="email" defaultValue={client.email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`groupName-${client.id}`}>Group</Label>
                <Input id={`groupName-${client.id}`} name="groupName" defaultValue={client.groupName ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`businessType-${client.id}`}>Trade / business</Label>
                <Input id={`businessType-${client.id}`} name="businessType" defaultValue={client.businessType ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`businessLocation-${client.id}`}>Business location</Label>
                <Input
                  id={`businessLocation-${client.id}`}
                  name="businessLocation"
                  defaultValue={client.businessLocation ?? ""}
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`address-${client.id}`}>Address</Label>
                <Input id={`address-${client.id}`} name="address" defaultValue={client.address ?? ""} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`landmark-${client.id}`}>Landmark</Label>
                <Input id={`landmark-${client.id}`} name="landmark" defaultValue={client.landmark ?? ""} required />
              </div>
              {collectors.length > 0 && (
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor={`loanCollectorId-${client.id}`}>Collections officer</Label>
                  <Select name="loanCollectorId" defaultValue={client.loanCollectorId ? String(client.loanCollectorId) : undefined}>
                    <SelectTrigger id={`loanCollectorId-${client.id}`} className="w-full">
                      <SelectValue placeholder="Unassigned" />
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
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {pending ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfileAction, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = { error: null };

export function EditProfileForm({ username, fullName, phone }: { username: string; fullName: string; phone: string | null }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateOwnProfileAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success("Profile updated.");
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (!editing) {
    return (
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Username</dt>
          <dd>@{username}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Full name</dt>
          <dd>{fullName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Phone</dt>
          <dd>{phone || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Edit details
          </Button>
        </div>
      </dl>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" defaultValue={username} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" defaultValue={fullName} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={phone ?? ""} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Changing your username signs you out of any other active sessions.</p>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending} className="bg-brand text-brand-foreground hover:bg-brand/90">
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(false)} disabled={pending}>
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

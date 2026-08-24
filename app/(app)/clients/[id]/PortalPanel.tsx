"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassPanel } from "@/components/layout/GlassPanel";
import {
  createPortalLoginAction,
  resetPortalLoginAction,
  createNoticeAction,
  type PortalLoginState,
  type NoticeFormState,
} from "./portalActions";

const initialLoginState: PortalLoginState = { error: null };
const initialNoticeState: NoticeFormState = { error: null };

export function PortalPanel({
  clientId,
  existingLogin,
}: {
  clientId: number;
  existingLogin: { id: number; username: string } | null;
}) {
  const [loginState, loginFormAction, loginPending] = useActionState(createPortalLoginAction, initialLoginState);
  const [resetPending, startReset] = useTransition();
  const [resetResult, setResetResult] = useState<{ username: string; tempPassword: string } | null>(null);
  const [noticeState, noticeFormAction, noticePending] = useActionState(createNoticeAction, initialNoticeState);

  useEffect(() => {
    if (noticeState === initialNoticeState) return;
    if (!noticePending && !noticeState.error) toast.success("Notice sent.");
  }, [noticePending, noticeState]);

  function handleReset(loginUserId: number) {
    startReset(async () => {
      const result = await resetPortalLoginAction(loginUserId, clientId);
      if (result.error) toast.error(result.error);
      else if (result.username && result.tempPassword) setResetResult({ username: result.username, tempPassword: result.tempPassword });
    });
  }

  return (
    <GlassPanel className="space-y-4 p-6">
      <h2 className="text-sm font-semibold text-muted-foreground">Client portal</h2>

      {existingLogin ? (
        <div className="space-y-3">
          <p className="text-sm">
            Portal login: <span className="font-medium">{existingLogin.username}</span>
          </p>
          <Button variant="secondary" size="sm" disabled={resetPending} onClick={() => handleReset(existingLogin.id)}>
            {resetPending ? "Resetting…" : "Reset password"}
          </Button>
          {resetResult && (
            <p className="rounded-lg bg-primary/10 p-3 text-xs">
              New temporary password for <span className="font-medium">{resetResult.username}</span>:{" "}
              <span className="font-mono font-medium">{resetResult.tempPassword}</span> — share this with the client now, it
              won&apos;t be shown again.
            </p>
          )}
        </div>
      ) : loginState.tempPassword ? (
        <p className="rounded-lg bg-primary/10 p-3 text-xs">
          Portal login created — username <span className="font-medium">{loginState.username}</span>, temporary password{" "}
          <span className="font-mono font-medium">{loginState.tempPassword}</span>. Share this with the client now, it
          won&apos;t be shown again.
        </p>
      ) : (
        <form action={loginFormAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <Button type="submit" variant="secondary" size="sm" disabled={loginPending}>
            {loginPending ? "Creating…" : "Create portal login"}
          </Button>
          {loginState.error && <p className="mt-2 text-sm text-destructive">{loginState.error}</p>}
        </form>
      )}

      <div className="space-y-1.5 border-t border-border pt-4">
        <Label htmlFor="notice-message">Send a notice</Label>
        <form action={noticeFormAction} className="flex gap-2">
          <input type="hidden" name="clientId" value={clientId} />
          <Input id="notice-message" name="message" placeholder="Message for this client's portal" required />
          <Button type="submit" size="sm" disabled={noticePending} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {noticePending ? "Sending…" : "Send"}
          </Button>
        </form>
        {noticeState.error && <p className="text-sm text-destructive">{noticeState.error}</p>}
      </div>
    </GlassPanel>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// Inline click-to-edit text used on the landing page when a super admin has
// edit mode on (see LandingPageView). Outside edit mode this renders exactly
// like plain text — no wrapper, no extra markup — so it's invisible to every
// other visitor.
export function EditableText({
  value,
  onSave,
  editMode,
  multiline,
  as: Tag = "span",
  className,
  inputClassName,
}: {
  value: string;
  onSave: (next: string) => Promise<{ error: string | null }>;
  editMode: boolean;
  multiline?: boolean;
  as?: "span" | "p" | "h1" | "h2";
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setError(null);
          setEditing(true);
        }}
        className={cn(
          "group/edit relative inline-flex items-start gap-1.5 rounded-md text-left outline-dashed outline-1 outline-offset-4 outline-brand/40 transition-colors hover:bg-brand/5",
          className,
        )}
      >
        <span>{value}</span>
        <Pencil className="mt-1 size-3 shrink-0 text-brand opacity-0 transition-opacity group-hover/edit:opacity-100" />
      </button>
    );
  }

  async function save() {
    if (draft.trim() === value.trim()) {
      setEditing(false);
      return;
    }
    setPending(true);
    setError(null);
    const result = await onSave(draft.trim());
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  return (
    <span className="inline-flex w-full max-w-full flex-col gap-1.5">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          rows={3}
          className={cn(
            "w-full rounded-md border border-brand/40 bg-background p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            inputClassName,
          )}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className={cn(
            "w-full rounded-md border border-brand/40 bg-background p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            inputClassName,
          )}
        />
      )}
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-xs font-medium text-brand-foreground disabled:opacity-50"
        >
          <Check className="size-3" />
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground disabled:opacity-50"
        >
          <X className="size-3" />
          Cancel
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    </span>
  );
}

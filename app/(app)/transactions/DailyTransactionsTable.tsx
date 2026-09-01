"use client";

import { useActionState, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, CheckCircle2, Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { saveDailyTransactionsAction, type DailyTransactionsState } from "./actions";
import { ReceiptDialog } from "./ReceiptDialog";

type PaymentStatus = "paid_on_day" | "paid_supplementary" | "due_today" | "overdue" | "not_due_yet";

type Row = {
  clientId: number;
  clientCode: string;
  fullName: string;
  groupName: string | null;
  paymentDay: number | null;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  loanDisbursement: string | null;
  loanRecovery: string | null;
  profitInterest: string | null;
  serviceCharge: string | null;
  newSavings: string | null;
  savingsRecall: string | null;
  collateralTransferIn: string | null;
  collateralTransferOut: string | null;
  notes: string | null;
  supplementaryOverride: string | null;
  savingsBalanceBf: string;
};

const initialState: DailyTransactionsState = { error: null, savedCount: 0 };

const FIELDS: { key: keyof Row; prefix: string; label: string; direction: "received" | "paidOut" }[] = [
  { key: "loanDisbursement", prefix: "ld", label: "Principal Disbursement", direction: "paidOut" },
  { key: "loanRecovery", prefix: "lr", label: "Principal Recovery", direction: "received" },
  { key: "profitInterest", prefix: "pi", label: "Profit", direction: "received" },
  { key: "serviceCharge", prefix: "sc", label: "Service Charge", direction: "received" },
  { key: "newSavings", prefix: "ns", label: "New Savings", direction: "received" },
  { key: "savingsRecall", prefix: "sr", label: "Savings Recall", direction: "paidOut" },
  { key: "collateralTransferIn", prefix: "ci", label: "Collateral In", direction: "received" },
  { key: "collateralTransferOut", prefix: "co", label: "Collateral Out", direction: "paidOut" },
];

const WEEKDAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid_on_day: { label: "Paid", icon: CheckCircle2, className: "bg-primary/15 text-primary" },
  paid_supplementary: { label: "Paid (Supplementary)", icon: CheckCircle2, className: "bg-primary/15 text-primary" },
  due_today: { label: "Due Today", icon: Clock, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  overdue: { label: "Overdue", icon: AlertTriangle, className: "bg-destructive/15 text-destructive" },
  not_due_yet: { label: "Not Due Yet", icon: CalendarClock, className: "bg-muted text-muted-foreground" },
};

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status, compact }: { status: PaymentStatus; compact?: boolean }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        compact && "px-1.5 py-0.5 text-[10px]",
        cfg.className,
      )}
    >
      <Icon className={compact ? "size-2.5" : "size-3"} />
      {compact ? cfg.label.replace(" (Supplementary)", "") : cfg.label}
    </span>
  );
}

function ClientCard({
  row,
  readOnly,
  selectedDay,
  transactionDate,
  branchId,
  branchName,
  preparedBy,
}: {
  row: Row;
  readOnly: boolean;
  selectedDay: number;
  transactionDate: string;
  branchId: number;
  branchName: string;
  preparedBy: string;
}) {
  const [open, setOpen] = useState(false);
  const [, formAction, pending] = useActionState(async (prev: DailyTransactionsState, formData: FormData) => {
    const result = await saveDailyTransactionsAction(prev, formData);
    if (result.error) toast.error(result.error);
    else if (result.savedCount > 0) {
      toast.success(`Saved ${row.fullName}.`);
      setOpen(false);
    } else if (result.submittedCount) {
      toast.success(`Submitted ${row.fullName}'s edit for admin approval.`);
      setOpen(false);
    }
    return result;
  }, initialState);
  const filledFields = FIELDS.filter((f) => Number(row[f.key] ?? 0) > 0);
  const offDay = row.paymentDay !== null && selectedDay !== row.paymentDay;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{row.fullName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{row.clientCode}</p>
          <StatusBadge status={row.paymentStatus} compact />
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto border-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {row.fullName}
            <StatusBadge status={row.paymentStatus} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {row.clientCode}
            {row.groupName ? ` · ${row.groupName}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.paymentDay !== null ? `Pays ${WEEKDAY_NAMES[row.paymentDay]}` : "No active loan"} · B/F{" "}
            {money(row.savingsBalanceBf)}
            {row.paymentId && <span className="font-mono"> · {row.paymentId}</span>}
          </div>

          {filledFields.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{filledFields.length} field(s) entered today</span>
              <div onClick={(e) => e.stopPropagation()}>
                <ReceiptDialog
                  clientName={row.fullName}
                  clientCode={row.clientCode}
                  groupName={row.groupName}
                  branchName={branchName}
                  transactionDate={transactionDate}
                  paymentId={row.paymentId}
                  notes={row.notes}
                  preparedBy={preparedBy}
                  received={FIELDS.filter((f) => f.direction === "received" && Number(row[f.key] ?? 0) > 0).map((f) => ({
                    label: f.label,
                    value: Number(row[f.key]),
                  }))}
                  paidOut={FIELDS.filter((f) => f.direction === "paidOut" && Number(row[f.key] ?? 0) > 0).map((f) => ({
                    label: f.label,
                    value: Number(row[f.key]),
                  }))}
                />
              </div>
            </div>
          )}

          <form action={formAction} className="space-y-3 border-t border-border pt-3">
            <input type="hidden" name="transactionDate" value={transactionDate} />
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="clientIds" value={String(row.clientId)} />
            <div
              className={cn(
                "space-y-2 rounded-lg px-3 py-2 text-xs",
                offDay ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted/50 text-muted-foreground",
              )}
            >
              <p>
                {row.paymentDay === null ? (
                  <>{row.fullName} has no active loan, so there&apos;s no assigned collection day to compare against.</>
                ) : (
                  <>
                    {row.fullName}&apos;s assigned collection day is <strong>{WEEKDAY_NAMES[row.paymentDay]}</strong>.
                    {offDay ? (
                      <>
                        {" "}
                        Today ({WEEKDAY_NAMES[selectedDay]}) is a different day, so a payment recorded here will be counted
                        as a <strong>Supplementary</strong> payment automatically.
                      </>
                    ) : (
                      " Today matches their assigned day, so a payment recorded here counts as on-time — this override isn't needed."
                    )}
                  </>
                )}
              </p>
              <label className={cn("flex items-center gap-1.5", !offDay && "opacity-50")}>
                <input
                  type="checkbox"
                  name={`sup_${row.clientId}`}
                  defaultChecked={row.supplementaryOverride === "not_supplementary"}
                  disabled={readOnly || !offDay}
                  className="size-3.5"
                />
                This was actually collected on time — data just entered late. Don&apos;t mark as Supplementary.
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.prefix} className="space-y-1">
                  <label className="block text-xs text-muted-foreground" htmlFor={`${f.prefix}_${row.clientId}`}>
                    {f.label}
                  </label>
                  <Input
                    id={`${f.prefix}_${row.clientId}`}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    name={`${f.prefix}_${row.clientId}`}
                    defaultValue={row[f.key] ?? ""}
                    disabled={readOnly}
                    className="h-9 w-full"
                  />
                </div>
              ))}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs text-muted-foreground" htmlFor={`nt_${row.clientId}`}>
                  Notes
                </label>
                <Input
                  id={`nt_${row.clientId}`}
                  name={`nt_${row.clientId}`}
                  defaultValue={row.notes ?? ""}
                  disabled={readOnly}
                  className="h-9 w-full"
                />
              </div>
            </div>
            {!readOnly && (
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={pending} className="bg-brand text-brand-foreground hover:bg-brand/90">
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const FILTERS: { key: "all" | PaymentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "due_today", label: "Due Today" },
  { key: "overdue", label: "Overdue" },
  { key: "paid_on_day", label: "Paid" },
  { key: "paid_supplementary", label: "Supplementary" },
  { key: "not_due_yet", label: "Not Due Yet" },
];

export function DailyTransactionsTable({
  rows,
  transactionDate,
  branchId,
  readOnly,
  branchName,
  preparedBy,
}: {
  rows: Row[];
  transactionDate: string;
  branchId: number;
  readOnly: boolean;
  branchName: string;
  preparedBy: string;
}) {
  const [search, setSearch] = useState("");
  // Default to "who's paying today" rather than dumping the entire roster on
  // load — the collector's immediate question when opening this page.
  const [filter, setFilter] = useState<"all" | PaymentStatus>("due_today");

  const selectedDay = useMemo(() => {
    const d = new Date(transactionDate + "T00:00:00Z");
    const day = d.getUTCDay();
    return day === 0 ? 7 : day;
  }, [transactionDate]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.paymentStatus] = (c[r.paymentStatus] ?? 0) + 1;
    return c;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.paymentStatus !== filter) return false;
      if (q && !r.fullName.toLowerCase().includes(q) && !r.clientCode.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filter]);

  return (
    <div>
      {rows.length > 0 && (
        <>
          <div data-tour="tour-txn-filters" className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  variant={filter === f.key ? "default" : "secondary"}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 min-w-4 px-1 text-[10px]",
                      filter === f.key && "border-primary-foreground/30 text-primary-foreground",
                    )}
                  >
                    {counts[f.key] ?? 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search client by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </>
      )}

      {filteredRows.length === 0 ? (
        <GlassPanel className="p-6 text-center text-muted-foreground">
          {rows.length === 0 ? "No active clients for this branch/collector." : "No clients match this filter."}
        </GlassPanel>
      ) : (
        <div data-tour="tour-txn-cards" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {filteredRows.map((r) => (
            <ClientCard
              key={r.clientId}
              row={r}
              readOnly={readOnly}
              selectedDay={selectedDay}
              transactionDate={transactionDate}
              branchId={branchId}
              branchName={branchName}
              preparedBy={preparedBy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

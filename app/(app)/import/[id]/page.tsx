import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/session";
import { getImportBatch, getImportBatchRows, IMPORT_TYPE_LABELS } from "@/lib/db/imports";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";

export default async function ImportBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("import", "view");
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId)) notFound();

  const batch = await getImportBatch(batchId);
  if (!batch) notFound();
  if (user.roleKey !== "super_admin" && batch.branchId !== user.branchId) notFound();

  const rows = await getImportBatchRows(batchId);

  return (
    <div className="space-y-4">
      <BackLink href="/import" label="Back to Excel Import" />
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg font-semibold">{batch.fileName}</h1>
        <Badge variant="secondary">{IMPORT_TYPE_LABELS[batch.importType] ?? batch.importType}</Badge>
        <Badge variant={batch.status === "completed" ? "default" : "secondary"} className="capitalize">
          {batch.status}
        </Badge>
      </div>

      <GlassPanel className="grid grid-cols-3 gap-4 p-6">
        <div>
          <p className="text-xs text-muted-foreground">Total rows</p>
          <p className="font-medium">{batch.totalRows}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Successful</p>
          <p className="font-medium text-primary">{batch.successRows}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Errors</p>
          <p className="font-medium text-destructive">{batch.errorRows}</p>
        </div>
      </GlassPanel>

      {rows.length === 0 ? (
        <EmptyBox>No rows recorded.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const raw = r.rawData as Record<string, unknown>;
            const name =
              {
                clients: raw["Full Name"],
                expenses: raw["Description"],
                transactions: raw["Client Code"],
                cash_book: raw["Details"] || raw["Date"],
              }[batch.importType] ?? raw["Full Name"];
            const detail =
              r.errorMessage ??
              (r.createdClientId
                ? "Client created"
                : r.createdExpenseId
                  ? "Expense created"
                  : r.createdTxnId
                    ? "Transaction saved"
                    : r.createdCashBookEntryId
                      ? "Entry created"
                      : "—");
            return (
              <RecordBox
                key={r.id}
                cols={3}
                header={
                  <>
                    <p className="font-medium">
                      Row {r.rowNumber} · {String(name ?? "—")}
                    </p>
                    <Badge variant={r.status === "success" ? "default" : "destructive"} className="capitalize">
                      {r.status}
                    </Badge>
                  </>
                }
                fields={[{ label: "Detail", value: detail, span: true }]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

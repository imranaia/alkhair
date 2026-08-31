import Link from "next/link";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listImportBatches, IMPORT_TYPE_LABELS } from "@/lib/db/imports";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";
import { Badge } from "@/components/ui/badge";
import { UploadForm } from "./UploadForm";

export default async function ImportPage() {
  const user = await requireModule("import", "view");
  const { canCreate } = await getModulePermission("import");
  const isSuperAdmin = user.roleKey === "super_admin";

  const [branches, batches] = await Promise.all([
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
    listImportBatches({ branchId: isSuperAdmin ? null : user.branchId }),
  ]);

  return (
    <div className="space-y-4">
      <div data-tour="tour-import" className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Excel Import</h1>
      </div>

      {canCreate && (
        <GlassPanel className="p-6">
          <UploadForm branches={branches} showBranchSelect={isSuperAdmin} />
        </GlassPanel>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Import history</h2>
      {batches.length === 0 ? (
        <EmptyBox>No imports yet.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {batches.map((b) => (
            <Link key={b.id} href={`/import/${b.id}`}>
              <RecordBox
                className="transition-colors hover:bg-accent/40"
                cols={isSuperAdmin ? 4 : 3}
                header={
                  <>
                    <p className="font-semibold">{b.fileName}</p>
                    <Badge variant={b.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {b.status}
                    </Badge>
                  </>
                }
                fields={[
                  { label: "Type", value: IMPORT_TYPE_LABELS[b.importType] ?? b.importType },
                  ...(isSuperAdmin ? [{ label: "Branch", value: b.branchName ?? "—" }] : []),
                  { label: "Uploaded By", value: b.uploadedByName },
                  { label: "Uploaded", value: new Date(b.createdAt).toLocaleString() },
                  {
                    label: "Success / Errors",
                    value: (
                      <>
                        <span className="text-foreground">{b.successRows}</span>
                        <span className="text-muted-foreground"> / {b.errorRows}</span>
                      </>
                    ),
                    align: "right" as const,
                  },
                ]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

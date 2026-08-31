import type { ReactNode } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { cn } from "@/lib/utils";

export type RecordField = {
  label: string;
  value: ReactNode;
  span?: boolean;
  align?: "left" | "right";
};

const COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
} as const;

export function RecordBox({
  header,
  fields,
  cols = 3,
  footer,
  className,
}: {
  header?: ReactNode;
  fields: RecordField[];
  cols?: keyof typeof COLS;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={cn("p-4", className)}>
      {header && <div className="mb-3 flex flex-wrap items-start justify-between gap-2">{header}</div>}
      <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2 text-sm", COLS[cols])}>
        {fields.map((f, i) => (
          <div key={i} className={f.span ? "col-span-full" : undefined}>
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className={cn("font-medium", f.align === "right" && "text-right")}>{f.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-3 border-t border-border/60 pt-3">{footer}</div>}
    </GlassPanel>
  );
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return <GlassPanel className="p-6 text-center text-muted-foreground">{children}</GlassPanel>;
}

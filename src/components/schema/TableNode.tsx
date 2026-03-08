import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { KeyRound, Link } from "lucide-react";
import type { ParsedColumn } from "@/lib/schema-parser";

export interface TableNodeData {
  label: string;
  columns: ParsedColumn[];
  fkColumns: Set<string>;
  [key: string]: unknown;
}

function TableNodeComponent({ data }: NodeProps) {
  const { label, columns, fkColumns } = data as unknown as TableNodeData;

  return (
    <div className="min-w-[200px] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-md">
      {/* Header */}
      <div className="border-b border-border bg-primary px-3 py-2">
        <span className="text-sm font-bold text-primary-foreground">
          {label}
        </span>
      </div>

      {/* Columns */}
      <div className="divide-y divide-border">
        {columns.map((col) => (
          <div
            key={col.name}
            className="flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            {/* Icon */}
            <span className="flex w-4 shrink-0 items-center justify-center">
              {col.primaryKey ? (
                <KeyRound className="h-3 w-3 text-amber-500" />
              ) : (fkColumns as Set<string>)?.has(col.name) ? (
                <Link className="h-3 w-3 text-blue-500" />
              ) : null}
            </span>

            {/* Name */}
            <span
              className={`flex-1 truncate ${
                col.primaryKey ? "font-semibold text-foreground" : "text-foreground"
              }`}
            >
              {col.name}
            </span>

            {/* Type */}
            <span className="shrink-0 text-muted-foreground">{col.type}</span>

            {/* Nullable indicator */}
            {col.nullable === false && (
              <span className="shrink-0 text-[10px] text-destructive">NN</span>
            )}
          </div>
        ))}
      </div>

      {/* Handles for edges */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-border !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-border !bg-primary"
      />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);

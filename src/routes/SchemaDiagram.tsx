import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SchemaViewer } from "@/components/schema/SchemaViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Database,
  Loader2,
  Maximize2,
  Table2,
  Columns3,
} from "lucide-react";
import { useMemo, useCallback } from "react";
import { parseDDL } from "@/lib/schema-parser";

export default function SchemaDiagram() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const schema = useQuery(
    api.dbSchemas.get,
    id ? { id: id as Id<"dbSchemas"> } : "skip",
  );

  const parsed = useMemo(
    () => (schema?.content ? parseDDL(schema.content) : null),
    [schema?.content],
  );

  const tableCount = parsed?.tables.length ?? 0;
  const columnCount = useMemo(
    () => parsed?.tables.reduce((sum, t) => sum + t.columns.length, 0) ?? 0,
    [parsed],
  );
  const relationshipCount = parsed?.relationships.length ?? 0;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Loading
  if (schema === undefined) {
    return (
      <ProtectedRoute>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    );
  }

  // Not found
  if (!schema) {
    return (
      <ProtectedRoute>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <Database className="size-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Schema not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back to Settings
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="h-5 w-px bg-border" />

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-semibold tracking-tight">
                {schema.name}
              </span>
              <Badge
                variant="outline"
                className="gap-1 border-border/60 font-mono text-[10px] tabular-nums text-muted-foreground"
              >
                <Table2 className="size-2.5" />
                {tableCount}
              </Badge>
              <Badge
                variant="outline"
                className="gap-1 border-border/60 font-mono text-[10px] tabular-nums text-muted-foreground"
              >
                <Columns3 className="size-2.5" />
                {columnCount}
              </Badge>
              {relationshipCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-border/60 font-mono text-[10px] tabular-nums text-muted-foreground"
                >
                  {relationshipCount} FK{relationshipCount !== 1 && "s"}
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleFullscreen}
            className="text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>

        {/* Full-bleed diagram canvas */}
        <div className="relative flex-1">
          <SchemaViewer schemaContent={schema.content} />
        </div>
      </div>
    </ProtectedRoute>
  );
}

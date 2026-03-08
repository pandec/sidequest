import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  BookOpen,
  Cpu,
  Palette,
  Plus,
  Trash2,
  Save,
  Loader2,
  Sun,
  Moon,
  GitGraph,
  GripHorizontal,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Coins,
  Wand2,
  PenLine,
  ArrowUpDown,
} from "lucide-react";
import { formatCost, formatTokens } from "@/lib/format-cost";
import { SchemaViewer } from "@/components/schema/SchemaViewer";

// ─── Schema Manager Tab ───────────────────────────────────────────────────────

function SchemaUploadForm({
  name,
  setName,
  content,
  setContent,
  isUploading,
  onUpload,
}: {
  name: string;
  setName: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  isUploading: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schema-name">Schema Name</Label>
        <Input
          id="schema-name"
          placeholder="e.g. analytics_warehouse"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="schema-content">DDL / Schema Content</Label>
        <Textarea
          id="schema-content"
          placeholder="CREATE TABLE `project.dataset.table` (&#10;  id INT64,&#10;  name STRING,&#10;  ...&#10;);"
          rows={10}
          className="font-mono text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <Button onClick={onUpload} disabled={isUploading}>
        {isUploading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Plus className="mr-2 size-4" />
        )}
        Upload Schema
      </Button>
    </div>
  );
}

// ─── Resizable Schema Card ────────────────────────────────────────────────────

function SchemaCard({
  schema,
  active,
  deleting,
  onSetActive,
  onDelete,
  onViewDiagram,
}: {
  schema: { _id: Id<"dbSchemas">; name: string; content: string };
  active: boolean;
  deleting: boolean;
  onSetActive: () => void;
  onDelete: () => void;
  onViewDiagram: () => void;
}) {
  const [previewHeight, setPreviewHeight] = useState(120);
  const [collapsed, setCollapsed] = useState(false);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const lineCount = schema.content.split("\n").length;
  const tableCount = (schema.content.match(/CREATE\s+TABLE/gi) || []).length;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = previewHeight;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = ev.clientY - startY.current;
        setPreviewHeight(Math.max(48, Math.min(600, startHeight.current + delta)));
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [previewHeight],
  );

  return (
    <div
      className={`group relative rounded-lg border transition-colors ${
        active
          ? "border-primary/40 bg-primary/[0.02] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)]"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Active indicator dot */}
        <div
          className={`size-2 shrink-0 rounded-full transition-colors ${
            active ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" : "bg-muted-foreground/20"
          }`}
        />

        {/* Name + meta */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="truncate font-mono text-sm font-semibold tracking-tight">
            {schema.name}
          </span>
          {active && (
            <Badge
              variant="secondary"
              className="border-primary/20 bg-primary/10 text-primary text-[10px] uppercase tracking-wider"
            >
              <Check className="mr-0.5 size-2.5" />
              Active
            </Badge>
          )}
          <span className="hidden text-[11px] tabular-nums text-muted-foreground/60 sm:inline">
            {tableCount} table{tableCount !== 1 && "s"} · {lineCount} lines
          </span>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          {!active && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={onSetActive}
            >
              Set Active
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronUp className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onViewDiagram}
          >
            <GitGraph className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Resizable preview */}
      {!collapsed && (
        <>
          <div className="relative mx-3 mb-1 overflow-hidden rounded-md border border-border/50 bg-muted/40">
            <pre
              className="overflow-auto p-3 font-mono text-xs leading-relaxed text-muted-foreground"
              style={{ height: previewHeight }}
            >
              {schema.content}
            </pre>

            {/* Fade-out at bottom when content overflows */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted/40 to-transparent" />
          </div>

          {/* Resize handle */}
          <div
            className="group/handle mx-3 mb-3 flex cursor-ns-resize items-center justify-center rounded-b py-1 transition-colors hover:bg-muted/60"
            onMouseDown={handleMouseDown}
          >
            <GripHorizontal className="size-4 text-muted-foreground/30 transition-colors group-hover/handle:text-muted-foreground/60" />
          </div>
        </>
      )}
    </div>
  );
}

function SchemaManager() {
  const schemas = useQuery(api.dbSchemas.list) ?? [];
  const createSchema = useMutation(api.dbSchemas.create);
  const removeSchema = useMutation(api.dbSchemas.remove);
  const setDefault = useMutation(api.dbSchemas.setDefault);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"dbSchemas"> | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [diagramSchemaId, setDiagramSchemaId] = useState<string | null>(null);

  const diagramSchema = schemas.find((s) => s._id === diagramSchemaId);
  const hasDefaultFlag = schemas.some((s) => s.isDefault);

  async function handleUpload() {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) {
      toast.error("Name and schema content are required.");
      return;
    }
    setIsUploading(true);
    try {
      await createSchema({ name: trimmedName, content: trimmedContent });
      toast.success("Schema uploaded successfully.");
      setName("");
      setContent("");
      setShowAddDialog(false);
    } catch {
      toast.error("Failed to upload schema.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: Id<"dbSchemas">) {
    setDeletingId(id);
    try {
      await removeSchema({ id });
      toast.success("Schema deleted.");
    } catch {
      toast.error("Failed to delete schema.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: Id<"dbSchemas">) {
    try {
      await setDefault({ id });
      toast.success("Active schema updated.");
    } catch {
      toast.error("Failed to set active schema.");
    }
  }

  function isActive(schema: (typeof schemas)[number], index: number) {
    if (hasDefaultFlag) return schema.isDefault === true;
    return index === 0;
  }

  return (
    <div className="space-y-6">
      {/* Upload: inline card when empty, button+dialog when schemas exist */}
      {schemas.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add New Schema</CardTitle>
            <CardDescription>
              Paste your BigQuery DDL / CREATE TABLE statements. The active
              schema is used as AI context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SchemaUploadForm
              name={name}
              setName={setName}
              content={content}
              setContent={setContent}
              isUploading={isUploading}
              onUpload={handleUpload}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Schema</DialogTitle>
                <DialogDescription>
                  Paste your BigQuery DDL / CREATE TABLE statements.
                </DialogDescription>
              </DialogHeader>
              <SchemaUploadForm
                name={name}
                setName={setName}
                content={content}
                setContent={setContent}
                isUploading={isUploading}
                onUpload={handleUpload}
              />
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Uploaded Schemas</CardTitle>
                  <CardDescription>
                    {`${schemas.length} schema${schemas.length > 1 ? "s" : ""} stored.`}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Add Schema
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {schemas.map((schema, index) => (
                <SchemaCard
                  key={schema._id}
                  schema={schema}
                  active={isActive(schema, index)}
                  deleting={deletingId === schema._id}
                  onSetActive={() => handleSetDefault(schema._id)}
                  onDelete={() => handleDelete(schema._id)}
                  onViewDiagram={() => setDiagramSchemaId(schema._id)}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Diagram dialog */}
      <Dialog
        open={diagramSchemaId !== null}
        onOpenChange={(open) => {
          if (!open) setDiagramSchemaId(null);
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>
                Schema Diagram — {diagramSchema?.name}
              </DialogTitle>
              {diagramSchemaId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setDiagramSchemaId(null);
                    navigate(`/schema/${diagramSchemaId}`);
                  }}
                >
                  <Maximize2 className="size-3.5" />
                  Full Page
                </Button>
              )}
            </div>
          </DialogHeader>
          {diagramSchema && (
            <div className="h-[70vh] rounded-lg border">
              <SchemaViewer schemaContent={diagramSchema.content} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Best Practices Editor Tab ────────────────────────────────────────────────

function BestPracticesEditor() {
  const data = useQuery(api.bestPractices.get);
  const upsert = useMutation(api.bestPractices.upsert);

  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data?.content && !loaded) {
      setContent(data.content);
      setLoaded(true);
    }
  }, [data, loaded]);

  async function handleSave() {
    if (!content.trim()) {
      toast.error("Best practices content cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      await upsert({ content: content.trim() });
      toast.success("Best practices saved.");
    } catch {
      toast.error("Failed to save best practices.");
    } finally {
      setIsSaving(false);
    }
  }

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Practices</CardTitle>
        <CardDescription>
          Edit the BigQuery SQL best practices document. The AI uses this as its
          rulebook when refining or writing queries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="font-mono text-sm"
          placeholder="Enter your BigQuery best practices..."
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Best Practices
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── LLM Configuration Tab ───────────────────────────────────────────────────

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

const EFFORT_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function LLMConfiguration() {
  const settings = useQuery(api.settings.get);
  const updateSettings = useMutation(api.settings.update);

  const [model, setModel] = useState("claude-sonnet-4-6");
  const [effort, setEffort] = useState("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      setModel(settings.model ?? "claude-sonnet-4-6");
      setEffort(settings.effort ?? "medium");
      setLoaded(true);
    }
  }, [settings, loaded]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateSettings({ model, effort });
      toast.success("LLM configuration saved.");
    } catch {
      toast.error("Failed to save LLM configuration.");
    } finally {
      setIsSaving(false);
    }
  }

  if (settings === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Configuration</CardTitle>
        <CardDescription>
          Choose the AI model and effort level for query refinement and writing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="model-select">Model</Label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="effort-select">Effort Level</Label>
          <select
            id="effort-select"
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {EFFORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Higher effort means more thorough analysis but slower responses.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Usage Analytics ─────────────────────────────────────────────────────────

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

function UsageAnalytics() {
  const analytics = useQuery(api.usageLogs.getUsageAnalytics);

  if (analytics === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Coins className="mx-auto mb-2 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No usage data yet. Start refining or writing queries to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { total, byModel, byMode, pricing } = analytics;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-4" />
            Usage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="font-mono text-lg font-semibold">{formatCost(total.estimatedCostUsd)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requests</p>
              <p className="font-mono text-lg font-semibold">{total.requests}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversations</p>
              <p className="font-mono text-lg font-semibold">{total.conversations}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg / Conversation</p>
              <p className="font-mono text-lg font-semibold">
                {total.conversations > 0
                  ? formatCost(total.estimatedCostUsd / total.conversations)
                  : "$0.00"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-model breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="size-4" />
            By Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(byModel).map(([model, data]) => {
            const pct = total.estimatedCostUsd > 0
              ? (data.estimatedCostUsd / total.estimatedCostUsd) * 100
              : 0;
            const modelPricing = pricing[model];
            return (
              <div key={model} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{MODEL_LABELS[model] ?? model}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {data.requests} req
                    </Badge>
                  </div>
                  <span className="font-mono text-sm font-semibold">
                    {formatCost(data.estimatedCostUsd)}
                  </span>
                </div>
                {/* Cost bar */}
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    <ArrowUpDown className="mr-0.5 inline size-2.5" />
                    {formatTokens(data.promptTokens)} in / {formatTokens(data.completionTokens)} out
                  </span>
                  {modelPricing && (
                    <span className="ml-auto">
                      ${modelPricing.input}/1M in · ${modelPricing.output}/1M out
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Per-mode breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="size-4" />
            By Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(byMode).map(([mode, data]) => {
              const ModeIcon = mode === "refine" ? Wand2 : mode === "write" ? PenLine : Cpu;
              const avgPerConv = data.conversations > 0
                ? data.estimatedCostUsd / data.conversations
                : 0;
              return (
                <div
                  key={mode}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <ModeIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium capitalize">{mode}</span>
                    <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                      {data.conversations} chats
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-mono font-semibold">{formatCost(data.estimatedCostUsd)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg / Chat</p>
                      <p className="font-mono font-semibold">{formatCost(avgPerConv)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Input</p>
                      <p className="font-mono">{formatTokens(data.promptTokens)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Output</p>
                      <p className="font-mono">{formatTokens(data.completionTokens)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Theme Tab ────────────────────────────────────────────────────────────────

function ThemeSettings() {
  const { resolvedTheme, setTheme } = useTheme();
  const updateSettings = useMutation(api.settings.update);

  const isDark = resolvedTheme === "dark";

  async function handleToggle(checked: boolean) {
    const newTheme = checked ? "dark" : "light";
    setTheme(newTheme);
    try {
      await updateSettings({ theme: newTheme as "light" | "dark" });
      toast.success(`Theme set to ${newTheme}.`);
    } catch {
      toast.error("Failed to save theme preference.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Toggle between light and dark mode. Your preference is synced across
          devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="size-5 text-muted-foreground" />
            ) : (
              <Sun className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isDark ? "Dark Mode" : "Light Mode"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isDark
                  ? "Using dark color scheme"
                  : "Using light color scheme"}
              </p>
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={handleToggle} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Tabs defaultValue="schema">
        <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pt-6 pb-4">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="mt-1 text-muted-foreground">
                Configure your database schema, BigQuery best practices, LLM model
                preferences, and theme.
              </p>
            </div>

            <TabsList className="w-full">
              <TabsTrigger value="schema">
                <Database className="mr-1.5 size-4" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="practices">
                <BookOpen className="mr-1.5 size-4" />
                Best Practices
              </TabsTrigger>
              <TabsTrigger value="llm">
                <Cpu className="mr-1.5 size-4" />
                LLM
              </TabsTrigger>
              <TabsTrigger value="theme">
                <Palette className="mr-1.5 size-4" />
                Theme
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <TabsContent value="schema">
              <SchemaManager />
            </TabsContent>

            <TabsContent value="practices">
              <BestPracticesEditor />
            </TabsContent>

            <TabsContent value="llm" className="space-y-6">
              <LLMConfiguration />
              <UsageAnalytics />
            </TabsContent>

            <TabsContent value="theme">
              <ThemeSettings />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </ProtectedRoute>
  );
}

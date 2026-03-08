import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Wand2,
  MessageSquare,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useQuery(
    api.queries.get,
    id ? { id: id as Id<"queries"> } : "skip"
  );
  const updateQuery = useMutation(api.queries.update);
  const removeQuery = useMutation(api.queries.remove);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  function startEdit() {
    if (!query) return;
    setEditTitle(query.title);
    setEditDescription(query.description ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!query) return;
    try {
      await updateQuery({
        id: query._id,
        title: editTitle.trim() || query.title,
        description: editDescription.trim() || undefined,
      });
      toast.success("Query updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update query");
    }
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function handleDelete() {
    if (!query) return;
    try {
      await removeQuery({ id: query._id });
      toast.success("Query deleted");
      navigate("/library");
    } catch {
      toast.error("Failed to delete query");
    }
  }

  function continueChat() {
    if (!query) return;
    const params = new URLSearchParams();
    params.set("sql", query.originalSql);
    if (query.refinedSql) params.set("refinedSql", query.refinedSql);
    if (query.threadId) params.set("threadId", query.threadId);
    params.set("queryId", query._id);
    navigate(`/refine?${params.toString()}`);
  }

  function openInRefiner() {
    if (!query) return;
    // For write mode, refinedSql holds the generated SQL; originalSql is empty
    const sql = query.mode === "write"
      ? (query.refinedSql ?? "")
      : (query.refinedSql ?? query.originalSql);
    const params = new URLSearchParams({ sql });
    navigate(`/refine?${params.toString()}`);
  }

  // Loading
  if (query === undefined) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    );
  }

  // Not found
  if (query === null) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-lg font-medium text-muted-foreground">
            Query not found
          </p>
          <Button variant="outline" onClick={() => navigate("/library")}>
            <ArrowLeft className="size-4" />
            Back to Library
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/library")}
          >
            <ArrowLeft className="size-4" />
            Library
          </Button>
        </div>

        {/* Header */}
        <div className="space-y-2">
          {editing ? (
            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Query title"
                className="text-2xl font-bold"
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>
                  <Check className="size-4" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="size-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight line-clamp-2">
                  {query.title}
                </h1>
                {query.description && (
                  <p className="text-muted-foreground">{query.description}</p>
                )}
              </div>
              <Badge
                variant={query.mode === "refine" ? "default" : "secondary"}
              >
                {query.mode}
              </Badge>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Created {formatDate(query.createdAt)}</span>
          {query.updatedAt !== query.createdAt && (
            <span>Updated {formatDate(query.updatedAt)}</span>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
            {query.threadId && (
              <Button variant="outline" size="sm" onClick={continueChat}>
                <MessageSquare className="size-4" />
                Continue Chat
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openInRefiner}>
              <Wand2 className="size-4" />
              Open in Refiner
            </Button>
            <Dialog>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="size-4" />
                Delete
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete query</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{query.title}"? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <DialogClose
                    render={<Button variant="destructive" onClick={handleDelete} />}
                  >
                    Delete
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <Separator />

        {/* SQL sections */}
        {query.mode === "write" ? (
          /* Write mode: show refinedSql as "Generated SQL" (originalSql is empty) */
          query.refinedSql && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Generated SQL</h2>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono leading-relaxed">
                {query.refinedSql}
              </pre>
            </div>
          )
        ) : (
          /* Refine mode: show Original + Refined */
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Original SQL</h2>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono leading-relaxed">
                {query.originalSql}
              </pre>
            </div>

            {query.refinedSql && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Refined SQL</h2>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono leading-relaxed">
                    {query.refinedSql}
                  </pre>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

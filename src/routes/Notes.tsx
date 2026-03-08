import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Eye, PenLine, StickyNote } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip basic markdown syntax for a plain-text preview. */
function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "") // headings
    .replace(/[*_~`>]/g, "") // emphasis, code, blockquote
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links / images
    .replace(/\n+/g, " ")
    .trim();
}

/** Human-friendly relative time without external deps. */
function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// NoteDialog — shared for create & edit
// ---------------------------------------------------------------------------

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id: Id<"notes">; title: string; content: string };
}

function NoteDialog({ open, onOpenChange, initial }: NoteDialogProps) {
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;

  // Reset form when dialog opens with new data
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTitle(initial?.title ?? "");
      setContent(initial?.content ?? "");
      setPreview(false);
    }
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateNote({ id: initial.id, title, content });
      } else {
        await createNote({ title, content });
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-content">Content</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setPreview((p) => !p)}
              >
                {preview ? (
                  <>
                    <PenLine className="size-3.5" /> Edit
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" /> Preview
                  </>
                )}
              </Button>
            </div>

            {preview ? (
              <div className="prose prose-sm dark:prose-invert max-h-64 min-h-[10rem] overflow-y-auto rounded-md border p-3">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground italic">
                    Nothing to preview
                  </p>
                )}
              </div>
            ) : (
              <Textarea
                id="note-content"
                placeholder="Write your note… (supports Markdown)"
                className="min-h-[10rem] font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Notes page
// ---------------------------------------------------------------------------

export default function Notes() {
  const notes = useQuery(api.notes.list);
  const removeNote = useMutation(api.notes.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id: Id<"notes">;
    title: string;
    content: string;
  } | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (note: { _id: Id<"notes">; title: string; content: string }) => {
    setEditing({ id: note._id, title: note.title, content: note.content });
    setDialogOpen(true);
  };

  const handleDelete = async (id: Id<"notes">) => {
    if (!window.confirm("Delete this note?")) return;
    await removeNote({ id });
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
            <p className="mt-1 text-muted-foreground">
              Capture ideas, snippets, and anything worth remembering.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" /> New Note
          </Button>
        </div>

        {/* Notes grid / empty state */}
        {notes === undefined ? null : notes.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <StickyNote className="size-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No notes yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first note to get started.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" /> New Note
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note: { _id: Id<"notes">; title: string; content: string; updatedAt: number }) => {
              const preview = stripMarkdown(note.content).slice(0, 100);
              return (
                <Card
                  key={note._id}
                  className="group flex cursor-pointer flex-col transition-shadow hover:shadow-md"
                  onClick={() => openEdit(note)}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{note.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {preview || "Empty note"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1" />

                  <CardFooter className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(note.updatedAt)}
                    </span>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          openEdit(note);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDelete(note._id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Shared create / edit dialog */}
        <NoteDialog
          key={editing?.id ?? "create"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={editing ?? undefined}
        />
      </div>
    </ProtectedRoute>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Wand2,
  PenLine,
  Trash2,
  Loader2,
  Search,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function truncatePreview(text: string, maxLength = 120): string {
  const firstLine = text.split("\n")[0] ?? "";
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength) + "…";
}

export default function History() {
  const queries = useQuery(api.queries.list);
  const removeQuery = useMutation(api.queries.remove);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const filtered = queries?.filter((q) => {
    const title = (q.title || "").toLowerCase();
    return title.includes(search.toLowerCase());
  });

  function handleNavigate(q: { mode?: string; threadId?: string; _id: Id<"queries"> }) {
    if (q.threadId) {
      const base = q.mode === "refine" ? "/refine" : "/write";
      navigate(`${base}?t=${q.threadId}`);
    } else {
      navigate(`/library/${q._id}`);
    }
  }

  async function handleDelete(id: Id<"queries">) {
    try {
      await removeQuery({ id });
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  }

  return (
    <ProtectedRoute>
      <div>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pt-6 pb-4">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">History</h1>
              <p className="mt-1 text-muted-foreground">
                Your past conversations and sessions
              </p>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="mx-auto max-w-7xl space-y-2">
            {/* Loading */}
            {queries === undefined && (
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {queries && queries.length === 0 && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
                <MessageSquare className="size-12 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">
                  No sessions yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a conversation to see your history here.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/refine")}>
                    <Wand2 className="mr-1.5 size-4" />
                    Refine
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/write")}>
                    <PenLine className="mr-1.5 size-4" />
                    Write
                  </Button>
                </div>
              </div>
            )}

            {/* No filter results */}
            {filtered && queries && queries.length > 0 && filtered.length === 0 && (
              <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-center">
                <p className="text-muted-foreground">
                  No sessions matching "{search}"
                </p>
              </div>
            )}

            {/* Session list */}
            {filtered && filtered.length > 0 && (
              <div className="flex flex-col gap-1">
                {filtered.map((q) => {
                  const title = q.title || "Untitled session";
                  const preview =
                    q.description ||
                    (q.originalSql ? truncatePreview(q.originalSql) : null);
                  const isRefine = q.mode === "refine";
                  const ModeIcon = isRefine ? Wand2 : PenLine;

                  return (
                    <div
                      key={q._id}
                      className="group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 cursor-pointer transition-colors hover:border-border hover:bg-muted/50"
                      onClick={() => handleNavigate(q)}
                    >
                      {/* Mode icon */}
                      <div className="flex shrink-0 items-center">
                        <ModeIcon className="size-4 text-muted-foreground" />
                      </div>

                      {/* Badge */}
                      <Badge
                        variant={isRefine ? "secondary" : "default"}
                        className="shrink-0"
                      >
                        {isRefine ? "Refine" : "Write"}
                      </Badge>

                      {/* Title + preview */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{title}</p>
                        {preview && (
                          <p className="truncate text-xs text-muted-foreground">
                            {preview}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(q.createdAt)}
                      </span>

                      {/* Delete */}
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                              }}
                            />
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </DialogTrigger>
                        <DialogContent
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <DialogHeader>
                            <DialogTitle>Delete session</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete "{title}"? This
                              action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose
                              render={<Button variant="outline" />}
                            >
                              Cancel
                            </DialogClose>
                            <DialogClose
                              render={
                                <Button
                                  variant="destructive"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleDelete(q._id);
                                  }}
                                />
                              }
                            >
                              Delete
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { Search, Trash2, Loader2, FileCode2 } from "lucide-react";
import { toast } from "sonner";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncateSql(sql: string, maxLines = 3) {
  const lines = sql.split("\n");
  const truncated = lines.slice(0, maxLines).join("\n");
  return lines.length > maxLines ? truncated + "\n..." : truncated;
}

export default function Library() {
  const queries = useQuery(api.queries.list);
  const removeQuery = useMutation(api.queries.remove);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const filtered = queries?.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: Id<"queries">) {
    try {
      await removeQuery({ id });
      toast.success("Query deleted");
    } catch {
      toast.error("Failed to delete query");
    }
  }

  return (
    <ProtectedRoute>
      <div>
        <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pt-6 pb-4">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Query Library</h1>
              <p className="mt-1 text-muted-foreground">
                Browse, search, and manage your saved queries.
              </p>
            </div>

            {/* Search bar */}
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
        <div className="mx-auto max-w-7xl space-y-6">
        {/* Loading */}
        {queries === undefined && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {queries && queries.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <FileCode2 className="size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              No saved queries yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Go refine or write one!
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => navigate("/refine")}>
                Refine a Query
              </Button>
              <Button variant="outline" onClick={() => navigate("/write")}>
                Write a Query
              </Button>
            </div>
          </div>
        )}

        {/* No results from filter */}
        {filtered && queries && queries.length > 0 && filtered.length === 0 && (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted-foreground">
              No queries matching "{search}"
            </p>
          </div>
        )}

        {/* Query grid */}
        {filtered && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((q) => (
              <Card
                key={q._id}
                className="group flex flex-col cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/library/${q._id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1">{q.title}</CardTitle>
                    <Badge
                      variant={q.mode === "refine" ? "default" : "secondary"}
                    >
                      {q.mode}
                    </Badge>
                  </div>
                  <CardDescription>
                    Created {formatDate(q.createdAt)}
                    {q.updatedAt !== q.createdAt && (
                      <> &middot; Updated {formatDate(q.updatedAt)}</>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <pre className="overflow-hidden rounded-md bg-muted p-2 text-xs font-mono text-muted-foreground leading-relaxed">
                    {truncateSql(q.originalSql)}
                  </pre>
                </CardContent>

                <CardFooter className="justify-end">
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
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
                        <DialogTitle>Delete query</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete "{q.title}"? This
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
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

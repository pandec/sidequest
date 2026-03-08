import { useState, useCallback, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { useSearchParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SqlEditor } from "@/components/editor/SqlEditor";
import { DiffView } from "@/components/editor/DiffView";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Wand2,
  Save,
  Loader2,
  Sparkles,
  Code,
  GitCompareArrows,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import { extractSqlFromResponse } from "@/lib/chat-utils";
import { useChatSession } from "@/hooks/useChatSession";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Refine() {
  // Convex hooks
  const createQuery = useMutation(api.queries.create);
  const updateQuery = useMutation(api.queries.update);
  const generateTitle = useAction(api.generateTitle.generateTitle);

  // Chat session
  const chat = useChatSession({ mode: "refine" });
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [originalSql, setOriginalSql] = useState("");
  const [refinedSql, setRefinedSql] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"editor" | "diff">("diff");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedQueryId, setSavedQueryId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const hasRefinement = refinedSql !== null;

  // ------ Initialize from URL params (use saved query record first) ------

  const tidParam = searchParams.get("threadId") || searchParams.get("t");
  const savedRecord = useQuery(
    api.queries.getByThreadId,
    tidParam ? { threadId: tidParam } : "skip",
  );

  useEffect(() => {
    if (initialized) return;
    const sqlParam = searchParams.get("sql");
    const refinedParam = searchParams.get("refinedSql");
    const tid = tidParam;

    // Handle non-thread params immediately
    if (!tid) {
      setInitialized(true);
      if (sqlParam) setOriginalSql(sqlParam);
      if (refinedParam) setRefinedSql(refinedParam);
      return;
    }

    // Wait for savedRecord to load
    if (savedRecord === undefined) return;
    setInitialized(true);

    // Restore from saved record
    const hasOriginal = savedRecord?.originalSql || sqlParam;
    const hasRefined = savedRecord?.refinedSql || refinedParam;

    if (savedRecord) {
      setSavedQueryId(savedRecord._id as string);
      if (savedRecord.originalSql) setOriginalSql(savedRecord.originalSql);
      if (savedRecord.refinedSql) setRefinedSql(savedRecord.refinedSql);
      if (savedRecord.description) setDescription(savedRecord.description);
    } else {
      if (sqlParam) setOriginalSql(sqlParam);
      if (refinedParam) setRefinedSql(refinedParam);
    }

    // Load chat messages and extract missing SQL from them
    chat.loadThreadMessages(tid).then((msgs) => {
      if (!hasOriginal) {
        const firstUser = msgs.find((m) => m.role === "user");
        if (firstUser) {
          const sqlMatch = firstUser.content.match(/```sql\n([\s\S]*?)```/);
          if (sqlMatch?.[1]) setOriginalSql(sqlMatch[1].trim());
        }
      }
      if (!hasRefined) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg?.role === "assistant") {
            const sql = extractSqlFromResponse(msg.content);
            if (sql) { setRefinedSql(sql); break; }
          }
        }
      }
    });

    // Clean up legacy params, keep only t
    if (sqlParam || refinedParam || searchParams.get("threadId")) {
      setSearchParams({ t: tid }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedRecord]);

  // ------ Sync threadId to URL ------

  useEffect(() => {
    if (chat.threadId) {
      setSearchParams({ t: chat.threadId }, { replace: true });
    }
  }, [chat.threadId, setSearchParams]);

  // ------ Refine handler (auto-saves session) ------

  const handleRefine = useCallback(async () => {
    const trimmedSql = originalSql.trim();
    if (!trimmedSql || chat.isLoading) return;

    chat.setIsLoading(true);
    setRefinedSql(null);

    const prompt = description.trim()
      ? `Please refine the following SQL query. Focus on: ${description.trim()}. Return the refined query in a \`\`\`sql code block.`
      : "Please refine the following SQL query for better performance, readability, and adherence to best practices. Return the refined query in a ```sql code block.";

    chat.addUserMessage(prompt);

    try {
      const { threadId: tid, aiText } = await chat.sendAndFetchResponse(
        prompt,
        chat.threadId,
        { originalSql: trimmedSql },
      );

      chat.setThreadId(tid);

      const extracted = aiText ? extractSqlFromResponse(aiText) : null;
      if (extracted) setRefinedSql(extracted);

      if (aiText) {
        chat.addAssistantMessage(aiText);
      } else {
        chat.addAssistantMessage(
          "Refinement complete. I was unable to retrieve the full response text right now -- try sending a follow-up message.",
        );
      }

      setViewMode("diff");

      // Auto-save session with originalSql
      try {
        if (savedQueryId) {
          await updateQuery({
            id: savedQueryId as any,
            originalSql: trimmedSql,
            refinedSql: extracted ?? undefined,
            description: description.trim() || undefined,
            threadId: tid,
          });
        } else {
          const id = await createQuery({
            title: "Untitled query",
            originalSql: trimmedSql,
            mode: "refine",
          });
          await updateQuery({
            id,
            refinedSql: extracted ?? undefined,
            description: description.trim() || undefined,
            threadId: tid,
          });
          setSavedQueryId(id as string);
          generateTitle({ id, description: description.trim(), sql: extracted ?? trimmedSql }).catch(() => {});
        }
      } catch (e) {
        console.warn("Auto-save failed:", e);
      }
    } catch (error) {
      console.error("Refine failed:", error);
      chat.addAssistantMessage(
        "Sorry, something went wrong while refining your query. Please try again.",
      );
    } finally {
      chat.setIsLoading(false);
    }
  }, [originalSql, description, chat, createQuery, updateQuery, generateTitle]);

  // ------ Follow-up chat handler ------

  const handleChatSend = useCallback(
    async (prompt: string) => {
      const extracted = await chat.handleChatSend(prompt, {
        originalSql: originalSql.trim() || undefined,
      });
      if (extracted) {
        setRefinedSql(extracted);
        if (savedQueryId) {
          updateQuery({ id: savedQueryId as any, refinedSql: extracted }).catch(() => {});
        }
      }
    },
    [chat, originalSql, savedQueryId, updateQuery],
  );

  // ------ Save to library (update existing auto-saved record) ------

  const handleSave = useCallback(async () => {
    if (!refinedSql || isSaving) return;

    setIsSaving(true);
    try {
      if (savedQueryId) {
        await updateQuery({
          id: savedQueryId as any,
          originalSql: originalSql.trim(),
          refinedSql,
          description: description.trim() || undefined,
          threadId: chat.threadId ?? undefined,
        });
      } else {
        const id = await createQuery({
          title: "Untitled query",
          originalSql: originalSql.trim(),
          mode: "refine",
        });
        await updateQuery({
          id,
          refinedSql,
          description: description.trim() || undefined,
          threadId: chat.threadId ?? undefined,
        });
        setSavedQueryId(id as string);
        generateTitle({ id, description: description.trim(), sql: refinedSql }).catch(() => {});
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    refinedSql,
    isSaving,
    savedQueryId,
    originalSql,
    description,
    chat.threadId,
    createQuery,
    updateQuery,
    generateTitle,
  ]);

  // ------ Reset ------

  const handleReset = useCallback(() => {
    setOriginalSql("");
    setRefinedSql(null);
    setViewMode("diff");
    setDescription("");
    chat.resetChat();
    setSavedQueryId(null);
    setCopied(false);
    setSearchParams({}, { replace: true });
  }, [chat, setSearchParams]);

  // ------ Copy refined SQL ------

  const handleCopy = useCallback(async () => {
    if (!refinedSql) return;
    await navigator.clipboard.writeText(refinedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [refinedSql]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col gap-6 overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        {/* ---- Page header ---- */}
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Wand2 className="size-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Query Refiner
                </h1>
                <p className="text-sm text-muted-foreground">
                  Paste your BigQuery SQL and get an optimized version with
                  explanations.
                </p>
              </div>
            </div>

            {hasRefinement && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                      />
                    }
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline">New Query</span>
                  </TooltipTrigger>
                  <TooltipContent>Start over with a new query</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* ---- Main grid ---- */}
        <div className="grid min-h-0 flex-1 grid-rows-[1fr] gap-6 overflow-hidden lg:grid-cols-2">
          {/* Left column: Editor + Results */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            {/* SQL editor card */}
            <Card className="shrink-0">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {hasRefinement ? "Original SQL" : "Your SQL"}
                    </span>
                  </div>
                  {hasRefinement && (
                    <Badge variant="outline">
                      {originalSql.split("\n").length} lines
                    </Badge>
                  )}
                </div>
                <SqlEditor
                  value={originalSql}
                  onChange={setOriginalSql}
                  readOnly={hasRefinement}
                  placeholder="Paste your BigQuery SQL here..."
                  height={hasRefinement ? "140px" : "300px"}
                />
              </CardContent>
            </Card>

            {/* Action bar (pre-refinement) */}
            {!hasRefinement && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label
                    htmlFor="refine-focus"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Focus area (optional)
                  </label>
                  <Input
                    id="refine-focus"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., optimize JOINs, improve readability, fix naming..."
                  />
                </div>
                <Button
                  onClick={handleRefine}
                  disabled={!originalSql.trim() || chat.isLoading}
                  size="lg"
                  className="gap-2"
                >
                  {chat.isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Refine Query
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Refinement result card */}
            {hasRefinement && (
              <Card className="flex min-h-0 flex-1 flex-col">
                <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                  {/* Toolbar */}
                  <div className="flex shrink-0 items-center justify-between">
                    <Tabs
                      value={viewMode}
                      onValueChange={(v) =>
                        setViewMode(v as "editor" | "diff")
                      }
                    >
                      <TabsList>
                        <TabsTrigger value="diff">
                          <GitCompareArrows className="size-3.5" />
                          <span>Diff</span>
                        </TabsTrigger>
                        <TabsTrigger value="editor">
                          <Code className="size-3.5" />
                          <span>Editor</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleCopy}
                              />
                            }
                          >
                            {copied ? (
                              <Check className="size-3.5 text-green-500" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {copied ? "Copied!" : "Copy refined SQL"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !!savedQueryId}
                        className="gap-1.5"
                      >
                        {isSaving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : savedQueryId ? (
                          <Check className="size-3.5 text-green-500" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        <span>
                          {savedQueryId
                            ? "Saved"
                            : isSaving
                              ? "Saving..."
                              : "Save to Library"}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <Separator className="shrink-0" />

                  {/* Diff or editable view — fills remaining space */}
                  <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-0">
                      {viewMode === "diff" ? (
                        <DiffView original={originalSql} modified={refinedSql} />
                      ) : (
                        <SqlEditor
                          value={refinedSql}
                          onChange={(v) => setRefinedSql(v)}
                          placeholder="Refined SQL..."
                          height="100%"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Chat panel (desktop) */}
          <div
            className={
              hasRefinement
                ? "min-h-0 lg:row-span-2"
                : "hidden min-h-0 lg:row-span-2 lg:block"
            }
          >
            <Card className="flex h-full flex-col overflow-hidden">
              <ChatPanel
                threadId={chat.threadId}
                mode="refine"
                onSend={handleChatSend}
                isLoading={chat.isLoading}
                messages={chat.messages}
              />
            </Card>
          </div>
        </div>

        {/* Mobile chat panel */}
        {hasRefinement && (
          <div className="lg:hidden">
            <Card className="h-96 overflow-hidden">
              <ChatPanel
                threadId={chat.threadId}
                mode="refine"
                onSend={handleChatSend}
                isLoading={chat.isLoading}
                messages={chat.messages}
              />
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

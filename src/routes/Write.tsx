import { useState, useCallback, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { useSearchParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SqlEditor } from "@/components/editor/SqlEditor";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  PenLine,
  Save,
  Loader2,
  Sparkles,
  Code,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import { extractSqlFromResponse } from "@/lib/chat-utils";
import { useChatSession } from "@/hooks/useChatSession";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Write() {
  // Convex hooks
  const createQuery = useMutation(api.queries.create);
  const updateQuery = useMutation(api.queries.update);
  const generateTitle = useAction(api.generateTitle.generateTitle);
  const [searchParams, setSearchParams] = useSearchParams();

  // Chat session
  const chat = useChatSession({ mode: "write" });

  // State
  const [description, setDescription] = useState("");
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedQueryId, setSavedQueryId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const hasGeneration = generatedSql !== null;

  // ------ Restore from URL (use saved query record first, fallback to messages) ------

  const tidParam = searchParams.get("t");
  const savedRecord = useQuery(
    api.queries.getByThreadId,
    tidParam ? { threadId: tidParam } : "skip",
  );

  useEffect(() => {
    if (initialized) return;
    const tid = tidParam;
    if (!tid) { setInitialized(true); return; }

    // Wait for savedRecord to load (undefined = loading, null = not found)
    if (savedRecord === undefined) return;
    setInitialized(true);

    // Restore from saved record
    if (savedRecord) {
      setSavedQueryId(savedRecord._id as string);
      if (savedRecord.description) setDescription(savedRecord.description);
      if (savedRecord.refinedSql) setGeneratedSql(savedRecord.refinedSql);
    }

    // Always load chat messages
    chat.loadThreadMessages(tid).then((msgs) => {
      // If no saved record, extract state from messages
      if (!savedRecord) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg?.role === "assistant") {
            const sql = extractSqlFromResponse(msg.content);
            if (sql) { setGeneratedSql(sql); break; }
          }
        }
        const firstUser = msgs.find((m) => m.role === "user");
        if (firstUser) {
          const desc = firstUser.content
            .replace(/^Please write a BigQuery SQL query for the following requirement:\n\n/, "")
            .replace(/\n\nReturn the query in a ```sql code block\.$/, "");
          setDescription(desc);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedRecord]);

  // ------ Sync threadId to URL ------

  useEffect(() => {
    if (chat.threadId) {
      setSearchParams({ t: chat.threadId }, { replace: true });
    }
  }, [chat.threadId, setSearchParams]);

  // ------ Write handler (auto-saves session) ------

  const handleWrite = useCallback(async () => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc || chat.isLoading) return;

    chat.setIsLoading(true);
    setGeneratedSql(null);
    setSavedQueryId(null);

    const prompt = `Please write a BigQuery SQL query for the following requirement:\n\n${trimmedDesc}\n\nReturn the query in a \`\`\`sql code block.`;

    // Optimistic user message
    chat.addUserMessage(prompt);

    try {
      const { threadId: tid, aiText } = await chat.sendAndFetchResponse(
        prompt,
        chat.threadId,
      );

      chat.setThreadId(tid);

      const extracted = aiText ? extractSqlFromResponse(aiText) : null;
      if (extracted) setGeneratedSql(extracted);

      if (aiText) {
        chat.addAssistantMessage(aiText);
      } else {
        chat.addAssistantMessage(
          "Query generated. I was unable to retrieve the full response text right now -- try sending a follow-up message.",
        );
      }

      // Auto-save session
      try {
        const id = await createQuery({
          title: "Untitled query",
          originalSql: "",
          mode: "write",
        });
        await updateQuery({
          id,
          refinedSql: extracted ?? undefined,
          description: trimmedDesc || undefined,
          threadId: tid,
        });
        setSavedQueryId(id as string);
        generateTitle({ id, description: trimmedDesc, sql: extracted ?? "" }).catch(() => {});
      } catch (e) {
        console.warn("Auto-save failed:", e);
      }
    } catch (error) {
      console.error("Write failed:", error);
      chat.addAssistantMessage(
        "Sorry, something went wrong while generating your query. Please try again.",
      );
    } finally {
      chat.setIsLoading(false);
    }
  }, [description, chat, createQuery, updateQuery, generateTitle]);

  // ------ Follow-up chat handler ------

  const handleChatSend = useCallback(
    async (prompt: string) => {
      const extracted = await chat.handleChatSend(prompt);
      if (extracted) {
        setGeneratedSql(extracted);
        // Update saved record with latest SQL
        if (savedQueryId) {
          updateQuery({
            id: savedQueryId as any,
            refinedSql: extracted,
          }).catch(() => {});
        }
      }
    },
    [chat, savedQueryId, updateQuery],
  );

  // ------ Save to library (update existing auto-saved record) ------

  const handleSave = useCallback(async () => {
    if (!generatedSql || isSaving) return;

    setIsSaving(true);
    try {
      if (savedQueryId) {
        // Update existing auto-saved record
        await updateQuery({
          id: savedQueryId as any,
          refinedSql: generatedSql,
          description: description.trim() || undefined,
          threadId: chat.threadId ?? undefined,
        });
      } else {
        // Fallback: create new if somehow not auto-saved
        const id = await createQuery({
          title: "Untitled query",
          originalSql: "",
          mode: "write",
        });
        await updateQuery({
          id,
          refinedSql: generatedSql,
          description: description.trim() || undefined,
          threadId: chat.threadId ?? undefined,
        });
        setSavedQueryId(id as string);
        generateTitle({ id, description: description.trim(), sql: generatedSql }).catch(() => {});
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    generatedSql,
    isSaving,
    savedQueryId,
    description,
    chat.threadId,
    createQuery,
    updateQuery,
    generateTitle,
  ]);

  // ------ Reset ------

  const handleReset = useCallback(() => {
    setDescription("");
    setGeneratedSql(null);
    chat.resetChat();
    setSavedQueryId(null);
    setCopied(false);
    setSearchParams({}, { replace: true });
  }, [chat, setSearchParams]);

  // ------ Copy generated SQL ------

  const handleCopy = useCallback(async () => {
    if (!generatedSql) return;
    await navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedSql]);

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
                <PenLine className="size-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Query Writer
                </h1>
                <p className="text-sm text-muted-foreground">
                  Describe what you need in natural language and let AI write the
                  BigQuery SQL for you.
                </p>
              </div>
            </div>

            {hasGeneration && (
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
          {/* Left column: Description + Generated SQL */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            {/* Description card */}
            <Card className="shrink-0">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <PenLine className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {hasGeneration
                      ? "Query Description"
                      : "Describe the query you need"}
                  </span>
                </div>
                {hasGeneration ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the query you need... e.g., 'Get the top 10 customers by total revenue in the last 30 days, broken down by region'"
                    rows={6}
                    className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  />
                )}
              </CardContent>
            </Card>

            {/* Action bar (pre-generation) */}
            {!hasGeneration && (
              <div className="flex justify-end">
                <Button
                  onClick={handleWrite}
                  disabled={!description.trim() || chat.isLoading}
                  size="lg"
                  className="gap-2"
                >
                  {chat.isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Writing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Write Query
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Generated SQL card */}
            {hasGeneration && (
              <Card className="flex min-h-0 flex-1 flex-col">
                <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                  {/* Toolbar */}
                  <div className="flex shrink-0 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Generated SQL</span>
                      <Badge variant="outline">
                        {generatedSql.split("\n").length} lines
                      </Badge>
                    </div>

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
                            {copied ? "Copied!" : "Copy SQL"}
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

                  {/* Editable SQL editor — fills remaining space */}
                  <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-0">
                      <SqlEditor
                        value={generatedSql}
                        onChange={(v) => setGeneratedSql(v)}
                        placeholder="Generated SQL..."
                        height="100%"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Chat panel (desktop) */}
          <div
            className={
              hasGeneration
                ? "min-h-0 lg:row-span-2"
                : "hidden min-h-0 lg:row-span-2 lg:block"
            }
          >
            <Card className="flex h-full flex-col overflow-hidden">
              <ChatPanel
                threadId={chat.threadId}
                mode="write"
                onSend={handleChatSend}
                isLoading={chat.isLoading}
                messages={chat.messages}
              />
            </Card>
          </div>
        </div>

        {/* Mobile chat panel */}
        {hasGeneration && (
          <div className="lg:hidden">
            <Card className="h-96 overflow-hidden">
              <ChatPanel
                threadId={chat.threadId}
                mode="write"
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

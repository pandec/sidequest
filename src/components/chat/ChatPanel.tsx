import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/format-cost";
import { Send, Loader2, User, Bot } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChatSession";

export type { ChatMessage };

interface ChatPanelProps {
  threadId: string | null;
  mode: "refine" | "write";
  onSend: (prompt: string) => void;
  isLoading: boolean;
  messages: ChatMessage[];
}

export function ChatPanel({
  threadId,
  mode,
  onSend,
  isLoading,
  messages,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      onSend(trimmed);
      setInput("");
    },
    [input, isLoading, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit],
  );

  const placeholder =
    mode === "refine"
      ? "Ask a follow-up about the refinement..."
      : "Describe changes or ask questions...";

  const threadUsage = useQuery(
    api.usageLogs.getThreadUsage,
    threadId ? { threadId } : "skip",
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Bot className="size-4 text-primary" />
        <span className="text-sm font-medium">AI Chat</span>
        {threadId && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Thread active
          </span>
        )}
        {threadUsage && threadUsage.estimatedCostUsd > 0 && (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {formatCost(threadUsage.estimatedCostUsd)}
          </span>
        )}
      </div>
      <Separator />

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {mode === "refine"
                  ? "Refine a query to start the conversation."
                  : "Generate a query to start the conversation."}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 rounded-lg px-3 py-3",
                msg.role === "user"
                  ? "bg-muted/50"
                  : "bg-transparent",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                  msg.role === "user"
                    ? "bg-foreground/10 text-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {msg.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    {msg.streaming && (
                      <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary/60" />
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && !messages.some((m) => m.streaming) && (
            <div className="flex gap-3 rounded-lg px-3 py-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="size-3.5" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <Separator />
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

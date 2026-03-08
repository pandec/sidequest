import { useState, useCallback, useMemo } from "react";
import { useAction, useQuery } from "convex/react";
import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "../../convex/_generated/api";
import { extractSqlFromResponse, nextMessageId } from "@/lib/chat-utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface QueryContext {
  originalSql?: string;
  schemaContent?: string;
  bestPracticesContent?: string;
}

interface UseChatSessionConfig {
  mode: "refine" | "write";
}

export function useChatSession(config: UseChatSessionConfig) {
  const sendChat = useAction(api.chat.send);
  const listMessagesAction = useAction(api.chat.listMessages);

  const bestPractices = useQuery(api.bestPractices.get);
  const defaultSchema = useQuery(api.dbSchemas.getDefault);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Optimistic user message shown before backend confirms
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );

  // Reactive streaming subscription — auto-updates as AI streams
  const uiMessages = useUIMessages(
    api.threadMessages.list,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true },
  );

  // Convert UIMessages to ChatMessages
  const messages: ChatMessage[] = useMemo(() => {
    const result: ChatMessage[] = [];

    if (uiMessages.results) {
      for (const msg of uiMessages.results) {
        if (msg.role === "user" || msg.role === "assistant") {
          result.push({
            id: msg.id,
            role: msg.role,
            content: (msg as any).text || "",
            streaming: (msg as any).status === "streaming",
          });
        }
      }
    }

    // Add pending optimistic user message if not yet in results
    if (pendingUserMessage) {
      const alreadyPresent = result.some(
        (m) => m.role === "user" && m.content === pendingUserMessage,
      );
      if (!alreadyPresent) {
        result.push({
          id: "pending-user",
          role: "user",
          content: pendingUserMessage,
        });
      }
    }

    return result;
  }, [uiMessages.results, pendingUserMessage]);

  // Check if AI is still streaming
  const isStreaming = useMemo(() => {
    return messages.some((m) => m.streaming);
  }, [messages]);

  /**
   * Send a prompt and let the reactive subscription handle the response.
   * Returns threadId once the action completes.
   */
  const sendPrompt = useCallback(
    async (
      prompt: string,
      currentThreadId: string | null,
      extraContext?: Omit<
        QueryContext,
        "schemaContent" | "bestPracticesContent"
      >,
    ) => {
      const result = await sendChat({
        prompt,
        mode: config.mode,
        threadId: currentThreadId ?? undefined,
        queryContext: {
          ...extraContext,
          schemaContent: defaultSchema?.content ?? undefined,
          bestPracticesContent: bestPractices?.content ?? undefined,
        },
      });
      return result.threadId;
    },
    [sendChat, defaultSchema, bestPractices, config.mode],
  );

  /**
   * Send a prompt to the AI. The response streams in via the reactive query.
   * Also does a one-shot fetch after completion for reliable SQL extraction.
   */
  const sendAndFetchResponse = useCallback(
    async (
      prompt: string,
      currentThreadId: string | null,
      extraContext?: Omit<
        QueryContext,
        "schemaContent" | "bestPracticesContent"
      >,
    ) => {
      setPendingUserMessage(prompt);
      const tid = await sendPrompt(prompt, currentThreadId, extraContext);
      setPendingUserMessage(null);

      // One-shot fetch to reliably get the final AI text for SQL extraction
      let aiText: string | null = null;
      try {
        const msgsResult = await listMessagesAction({
          threadId: tid,
          numItems: 50,
        });
        const page = (msgsResult as any)?.page ?? [];
        const lastAssistant = [...page]
          .reverse()
          .find(
            (m: any) =>
              (m.role === "assistant" || m.message?.role === "assistant") &&
              (m.text || m.message?.content),
          );
        if (lastAssistant) {
          aiText =
            lastAssistant.text ??
            lastAssistant.message?.content ??
            (typeof lastAssistant.content === "string"
              ? lastAssistant.content
              : null);
        }
      } catch (err) {
        console.warn("Could not fetch thread messages:", err);
      }

      return { threadId: tid, aiText };
    },
    [sendPrompt, listMessagesAction],
  );

  /**
   * Follow-up chat handler. Returns extracted SQL if any.
   */
  const handleChatSend = useCallback(
    async (
      prompt: string,
      extraContext?: Omit<
        QueryContext,
        "schemaContent" | "bestPracticesContent"
      >,
    ): Promise<string | null> => {
      if (!threadId || isLoading) return null;

      setIsLoading(true);

      try {
        const { aiText } = await sendAndFetchResponse(
          prompt,
          threadId,
          extraContext,
        );
        return aiText ? extractSqlFromResponse(aiText) : null;
      } catch (error) {
        console.error("Chat send failed:", error);
        setPendingUserMessage(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, isLoading, sendAndFetchResponse],
  );

  /** Add a user message optimistically (for display before send) */
  const addUserMessage = useCallback((content: string) => {
    setPendingUserMessage(content);
  }, []);

  /** Add an assistant message — no-op with streaming, messages come from reactive query */
  const addAssistantMessage = useCallback((_content: string) => {
    // No-op: assistant messages now come from the reactive subscription
  }, []);

  /** Load messages from an existing thread. Returns loaded messages. */
  const loadThreadMessages = useCallback(
    async (existingThreadId: string): Promise<ChatMessage[]> => {
      try {
        const msgsResult = await listMessagesAction({
          threadId: existingThreadId,
          numItems: 50,
        });
        const page = (msgsResult as any)?.page ?? [];
        const loaded: ChatMessage[] = page
          .filter(
            (m: any) =>
              m.role === "user" ||
              m.role === "assistant" ||
              m.message?.role,
          )
          .map((m: any) => ({
            id: nextMessageId(),
            role: m.role ?? m.message?.role,
            content:
              m.text ??
              m.message?.content ??
              (typeof m.content === "string" ? m.content : ""),
          }));
        // Setting threadId will trigger the reactive subscription
        setThreadId(existingThreadId);
        return loaded;
      } catch (err) {
        console.warn("Could not load thread messages:", err);
        return [];
      }
    },
    [listMessagesAction],
  );

  /** Reset all chat state */
  const resetChat = useCallback(() => {
    setThreadId(null);
    setIsLoading(false);
    setPendingUserMessage(null);
  }, []);

  return {
    messages,
    threadId,
    isLoading: isLoading || isStreaming,
    setThreadId,
    setIsLoading,
    sendAndFetchResponse,
    handleChatSend,
    addUserMessage,
    addAssistantMessage,
    loadThreadMessages,
    resetChat,
  };
}

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { sqlAgent } from "./agents";

export const send = action({
  args: {
    prompt: v.string(),
    mode: v.union(v.literal("refine"), v.literal("write")),
    threadId: v.optional(v.string()),
    queryContext: v.optional(
      v.object({
        originalSql: v.optional(v.string()),
        schemaContent: v.optional(v.string()),
        bestPracticesContent: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Build dynamic context to append to instructions
    const contextParts: string[] = [];

    if (args.queryContext?.bestPracticesContent) {
      contextParts.push(
        `\n\n--- Best Practices (apply these rules) ---\n${args.queryContext.bestPracticesContent}`
      );
    }

    if (args.queryContext?.schemaContent) {
      contextParts.push(
        `\n\n--- Database Schema (use for accurate table/column references) ---\n${args.queryContext.schemaContent}`
      );
    }

    if (args.mode === "refine" && args.queryContext?.originalSql) {
      contextParts.push(
        `\n\n--- Original SQL to Refine ---\n\`\`\`sql\n${args.queryContext.originalSql}\n\`\`\``
      );
    }

    const dynamicInstructions =
      contextParts.length > 0 ? contextParts.join("") : undefined;

    // Create or continue thread
    let threadId: string;
    let thread;

    if (args.threadId) {
      const result = await sqlAgent.continueThread(ctx, {
        threadId: args.threadId,
      });
      thread = result.thread;
      threadId = args.threadId;
    } else {
      const result = await sqlAgent.createThread(ctx, {});
      thread = result.thread;
      threadId = result.threadId;
    }

    // Stream response with deltas saved to DB for real-time UI
    const streamResult = await thread.streamText(
      {
        prompt: args.prompt,
        ...(dynamicInstructions ? { system: dynamicInstructions } : {}),
      },
      { saveStreamDeltas: true },
    );

    // Consume the stream to completion
    for await (const _chunk of streamResult.textStream) {
      // Stream is consumed; deltas are saved to DB automatically
    }

    // Record token usage
    const usage = await streamResult.usage;
    if (usage) {
      await ctx.runMutation(internal.usageLogs.record, {
        threadId,
        model: "claude-sonnet-4-6",
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
      });
    }

    return {
      threadId,
      messageId: streamResult.messageId,
    };
  },
});

export const listMessages = action({
  args: {
    threadId: v.string(),
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { listMessages: listMsgs } = await import("@convex-dev/agent");
    return await listMsgs(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: {
        cursor: args.cursor ?? null,
        numItems: args.numItems ?? 50,
      },
    });
  },
});

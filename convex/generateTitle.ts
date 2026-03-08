"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const generateTitle = action({
  args: {
    id: v.id("queries"),
    description: v.string(),
    sql: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sqlPart = args.sql
      ? ` The SQL is: ${args.sql}`
      : "";

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `Generate a very short title (max 50 chars) for a SQL query. The user described it as: ${args.description}.${sqlPart} If SQL is provided, consider it too. Reply with ONLY the title, no quotes, no explanation.`,
    });

    const title = text.trim().slice(0, 50);

    await ctx.runMutation(api.queries.update, {
      id: args.id,
      title,
    });

    return title;
  },
});

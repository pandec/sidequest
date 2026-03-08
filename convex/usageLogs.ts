import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Pricing per token (USD)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  "claude-haiku-4-5-20251001": { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
};
const DEFAULT_PRICING = { input: 3 / 1_000_000, output: 15 / 1_000_000 };

export const record = internalMutation({
  args: {
    threadId: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const rates = PRICING[args.model] ?? DEFAULT_PRICING;
    const totalTokens = args.promptTokens + args.completionTokens;
    const estimatedCostUsd =
      args.promptTokens * rates.input + args.completionTokens * rates.output;

    await ctx.db.insert("usageLogs", {
      userId: user._id,
      threadId: args.threadId,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens,
      estimatedCostUsd,
      createdAt: Date.now(),
    });
  },
});

const ZERO_USAGE = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };

export const getThreadUsage = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return ZERO_USAGE;

    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    return logs.reduce(
      (acc, log) => ({
        promptTokens: acc.promptTokens + log.promptTokens,
        completionTokens: acc.completionTokens + log.completionTokens,
        totalTokens: acc.totalTokens + log.totalTokens,
        estimatedCostUsd: acc.estimatedCostUsd + log.estimatedCostUsd,
      }),
      { ...ZERO_USAGE },
    );
  },
});

export const getUserTotalUsage = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return ZERO_USAGE;

    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return logs.reduce(
      (acc, log) => ({
        promptTokens: acc.promptTokens + log.promptTokens,
        completionTokens: acc.completionTokens + log.completionTokens,
        totalTokens: acc.totalTokens + log.totalTokens,
        estimatedCostUsd: acc.estimatedCostUsd + log.estimatedCostUsd,
      }),
      { ...ZERO_USAGE },
    );
  },
});

// Expose pricing as a map for the frontend
export const MODEL_PRICING = PRICING;

export const getUsageAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (logs.length === 0) return null;

    // Per-model breakdown
    const byModel: Record<string, typeof ZERO_USAGE & { requests: number }> = {};
    // Collect unique threadIds for mode lookup
    const threadIds = new Set<string>();

    for (const log of logs) {
      const key = log.model;
      if (!byModel[key]) {
        byModel[key] = { ...ZERO_USAGE, requests: 0 };
      }
      const entry = byModel[key];
      entry.promptTokens += log.promptTokens;
      entry.completionTokens += log.completionTokens;
      entry.totalTokens += log.totalTokens;
      entry.estimatedCostUsd += log.estimatedCostUsd;
      entry.requests += 1;
      threadIds.add(log.threadId);
    }

    // Look up modes from queries table
    const threadModes: Record<string, string> = {};
    for (const tid of threadIds) {
      const q = await ctx.db
        .query("queries")
        .withIndex("by_user", (qb) => qb.eq("userId", user._id))
        .filter((qb) => qb.eq(qb.field("threadId"), tid))
        .first();
      if (q) threadModes[tid] = q.mode;
    }

    // Per-mode breakdown
    const byMode: Record<string, typeof ZERO_USAGE & { requests: number; conversations: number }> = {};
    const modeThreads: Record<string, Set<string>> = {};
    for (const log of logs) {
      const mode = threadModes[log.threadId] ?? "unknown";
      if (!byMode[mode]) {
        byMode[mode] = { ...ZERO_USAGE, requests: 0, conversations: 0 };
        modeThreads[mode] = new Set();
      }
      const entry = byMode[mode];
      entry.promptTokens += log.promptTokens;
      entry.completionTokens += log.completionTokens;
      entry.totalTokens += log.totalTokens;
      entry.estimatedCostUsd += log.estimatedCostUsd;
      entry.requests += 1;
      modeThreads[mode]!.add(log.threadId);
    }
    for (const [mode, threads] of Object.entries(modeThreads)) {
      if (byMode[mode]) byMode[mode].conversations = threads.size;
    }

    // Totals
    const totalRequests = logs.length;
    const totalConversations = threadIds.size;
    const total = logs.reduce(
      (acc, log) => ({
        promptTokens: acc.promptTokens + log.promptTokens,
        completionTokens: acc.completionTokens + log.completionTokens,
        totalTokens: acc.totalTokens + log.totalTokens,
        estimatedCostUsd: acc.estimatedCostUsd + log.estimatedCostUsd,
      }),
      { ...ZERO_USAGE },
    );

    // Pricing info (static, for display)
    const pricing: Record<string, { input: number; output: number }> = {};
    for (const [model, rates] of Object.entries(PRICING)) {
      pricing[model] = { input: rates.input * 1_000_000, output: rates.output * 1_000_000 };
    }

    return {
      total: { ...total, requests: totalRequests, conversations: totalConversations },
      byModel,
      byMode,
      pricing,
    };
  },
});

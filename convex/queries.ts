import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("queries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("queries") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) return null;

    return doc;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    originalSql: v.string(),
    mode: v.union(v.literal("refine"), v.literal("write")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("queries", {
      userId: user._id,
      title: args.title,
      originalSql: args.originalSql,
      mode: args.mode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("queries"),
    title: v.optional(v.string()),
    originalSql: v.optional(v.string()),
    refinedSql: v.optional(v.string()),
    description: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Query not found or not owned by user");
    }

    const { id, ...fields } = args;
    // Filter out undefined values
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("queries") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Query not found or not owned by user");
    }

    await ctx.db.delete(args.id);
  },
});

export const getByThreadId = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db
      .query("queries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .order("desc")
      .first();

    return doc;
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("queries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

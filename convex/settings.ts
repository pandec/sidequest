import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

const DEFAULTS = {
  model: "claude-sonnet-4-6",
  effort: "medium",
  theme: "light" as const,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!doc) {
      return { ...DEFAULTS, _id: null };
    }

    return doc;
  },
});

export const update = mutation({
  args: {
    model: v.optional(v.string()),
    effort: v.optional(v.string()),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.model !== undefined) updates.model = args.model;
      if (args.effort !== undefined) updates.effort = args.effort;
      if (args.theme !== undefined) updates.theme = args.theme;

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      userId: user._id,
      model: args.model ?? DEFAULTS.model,
      effort: args.effort ?? DEFAULTS.effort,
      theme: args.theme ?? DEFAULTS.theme,
    });
  },
});

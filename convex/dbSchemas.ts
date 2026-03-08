import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("dbSchemas")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("dbSchemas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) return null;

    return doc;
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const all = await ctx.db
      .query("dbSchemas")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return all.find((s) => s.isDefault === true) ?? all[0] ?? null;
  },
});

export const setDefault = mutation({
  args: { id: v.id("dbSchemas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Schema not found or not owned by user");
    }

    const all = await ctx.db
      .query("dbSchemas")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const schema of all) {
      if (schema.isDefault) {
        await ctx.db.patch(schema._id, { isDefault: false });
      }
    }

    await ctx.db.patch(args.id, { isDefault: true });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("dbSchemas", {
      userId: user._id,
      name: args.name,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("dbSchemas"),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Schema not found or not owned by user");
    }

    const { id, ...fields } = args;
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
  args: { id: v.id("dbSchemas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Schema not found or not owned by user");
    }

    await ctx.db.delete(args.id);
  },
});

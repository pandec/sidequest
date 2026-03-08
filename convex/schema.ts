import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  queries: defineTable({
    userId: v.id("users"),
    title: v.string(),
    originalSql: v.string(),
    refinedSql: v.optional(v.string()),
    mode: v.union(v.literal("refine"), v.literal("write")),
    description: v.optional(v.string()),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  dbSchemas: defineTable({
    userId: v.id("users"),
    name: v.string(),
    content: v.string(),
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  bestPractices: defineTable({
    userId: v.id("users"),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  settings: defineTable({
    userId: v.id("users"),
    model: v.string(),
    effort: v.string(),
    theme: v.union(v.literal("light"), v.literal("dark")),
  }).index("by_user", ["userId"]),

  usageLogs: defineTable({
    userId: v.id("users"),
    threadId: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimatedCostUsd: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_thread", ["threadId"]),
});

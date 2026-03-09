import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  settings: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    theme: v.union(v.literal("light"), v.literal("dark")),
  }).index("by_user", ["userId"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});

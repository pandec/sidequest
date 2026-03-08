import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  return user;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // User exists — update if profile changed
      if (
        user.name !== identity.name ||
        user.email !== identity.email ||
        user.imageUrl !== identity.pictureUrl
      ) {
        await ctx.db.patch(user._id, {
          name: identity.name ?? "",
          email: identity.email ?? "",
          imageUrl: identity.pictureUrl ?? "",
        });
      }
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      name: identity.name ?? "",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const DEFAULT_BEST_PRACTICES = `# BigQuery SQL Best Practices

## Naming Conventions
- Use snake_case for table and column names
- Prefix dimension tables with \`dim_\`, fact tables with \`fact_\`, staging with \`stg_\`
- Use descriptive, unambiguous column names (e.g. \`order_created_at\` not \`created\`)
- Avoid reserved words as identifiers

## Partitioning & Clustering
- Always partition large tables by date/timestamp column (e.g. \`PARTITION BY DATE(created_at)\`)
- Add clustering on frequently filtered columns (\`CLUSTER BY customer_id, region\`)
- Use partition filters in WHERE clauses to limit scanned data
- Prefer ingestion-time partitioning for append-only tables

## JOINs
- Always qualify column names with table aliases
- Place the largest table first in JOIN order
- Use INNER JOIN over CROSS JOIN when possible
- Avoid joining on expressions — pre-compute in CTEs
- Filter early: apply WHERE conditions before JOINs when possible

## CTEs (Common Table Expressions)
- Use CTEs to break complex queries into readable, named steps
- Name CTEs descriptively (e.g. \`active_users\`, \`monthly_revenue\`)
- Avoid deeply nested subqueries — refactor into CTEs
- Materialized CTEs can be reused; consider temp tables for heavy reuse

## Window Functions
- Prefer window functions over self-joins for ranking, running totals
- Use QUALIFY clause (BigQuery-specific) to filter window results
- Common patterns: ROW_NUMBER(), LAG(), LEAD(), SUM() OVER, NTILE()
- Always define explicit PARTITION BY and ORDER BY in OVER clause

## Cost Optimization
- SELECT only needed columns — avoid SELECT *
- Use LIMIT during development/testing
- Leverage approximate aggregation functions (APPROX_COUNT_DISTINCT, HLL_COUNT)
- Use materialized views for frequently run aggregations
- Check query cost with dry run before executing large queries
- Prefer DATE over TIMESTAMP when time precision isn't needed
- Use streaming inserts sparingly — prefer batch loads
`;

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db
      .query("bestPractices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return {
      content: doc?.content ?? DEFAULT_BEST_PRACTICES,
      _id: doc?._id,
      updatedAt: doc?.updatedAt,
    };
  },
});

export const upsert = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("bestPractices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("bestPractices", {
      userId: user._id,
      content: args.content,
      updatedAt: now,
    });
  },
});

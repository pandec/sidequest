import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { components } from "./_generated/api";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { v } from "convex/values";

/**
 * Query for thread messages with real-time streaming support.
 * Used by useThreadMessages / useUIMessages hooks on the frontend.
 */
export const list = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });
    return { ...paginated, streams };
  },
});

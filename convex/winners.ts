import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Store a winner in the database
export const saveWinner = mutation({
  args: {
    name: v.string(),
    raceDuration: v.number(),
  },
  returns: v.id("winners"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("winners", {
      name: args.name,
      raceDuration: args.raceDuration,
      timestamp: Date.now(),
    });
  },
});

// Get the latest winner (optional)
export const getLatestWinner = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("winners"),
      _creationTime: v.number(),
      name: v.string(),
      raceDuration: v.number(),
      timestamp: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const winners = await ctx.db
      .query("winners")
      .order("desc")
      .take(1);
    
    return winners.length > 0 ? winners[0] : null;
  },
}); 
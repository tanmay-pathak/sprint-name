import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Add a new sprint name to the database
export const addSprintName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("sprintNames"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("sprintNames", {
      name: args.name,
      active: true,
    });
  },
});

// Get all active sprint names
export const listActiveSprintNames = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sprintNames"),
      _creationTime: v.number(),
      name: v.string(),
      active: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("sprintNames")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

// Remove all sprint names from the active list
export const clearActiveSprintNames = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const activeNames = await ctx.db
      .query("sprintNames")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
    
    for (const name of activeNames) {
      await ctx.db.patch(name._id, { active: false });
    }
    
    return null;
  },
});

// Deactivate a single sprint name
export const deactivateSprintName = mutation({
  args: {
    id: v.id("sprintNames"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false });
    return null;
  },
}); 
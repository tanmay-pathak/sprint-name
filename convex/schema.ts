import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sprintNames: defineTable({
    name: v.string(),
    active: v.boolean(),
  }),
  
  winners: defineTable({
    name: v.string(),
    raceDuration: v.number(),
    timestamp: v.number(),
  }),
}); 
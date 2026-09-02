import type { Context } from "hono";

// Hono context variable types — set by middleware, read in route handlers.
export type AppVariables = {
  requestId: string;
  userId: string;
  userEmail: string;
  userRole: "user" | "admin";
  userStatus: "pending" | "active" | "suspended";
  agentTokenId: string;
};

export type AppContext = Context<{ Variables: AppVariables }>;

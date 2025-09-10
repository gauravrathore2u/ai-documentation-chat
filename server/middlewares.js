import { clerkMiddleware, getAuth } from "@clerk/express";

export const clerkProtect = clerkMiddleware();

export function getUserInfo(req) {
  const auth = getAuth(req);
  if (!auth.userId) return null;
  return {
    userId: auth.userId,
    sessionId: auth.sessionId,
    ...auth,
  };
}

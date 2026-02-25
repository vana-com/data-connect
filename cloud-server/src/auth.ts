import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const AUTH_TOKEN =
  process.env.AUTH_TOKEN || crypto.randomBytes(32).toString("hex");

export function getAuthToken(): string {
  return AUTH_TOKEN;
}

/** Express middleware: require `?token=` query param or `Authorization: Bearer` header. */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const queryToken = req.query.token as string | undefined;
  const headerToken = req.headers.authorization?.replace("Bearer ", "");
  const token = queryToken || headerToken;

  if (token === AUTH_TOKEN) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

/** Validate a token string (used for WebSocket upgrade). */
export function validateToken(token: string | undefined): boolean {
  return token === AUTH_TOKEN;
}

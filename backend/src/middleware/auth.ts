import { NextFunction, Request, Response } from "express";
import { verifyToken, Role } from "../lib/jwt";
import { forbidden, unauthorized } from "../lib/errors";

// Verifies the JWT and attaches { id, role } to req.user.
// This is the ONLY source of truth for identity/role — never trust a client-supplied role or id.
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(unauthorized());
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role, organizationId: payload.orgId };
    next();
  } catch {
    next(unauthorized("โทเค็นไม่ถูกต้องหรือหมดอายุ"));
  }
};

export const requireRole = (role: Role) => (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== role) return next(forbidden());
  next();
};

// Allows an admin to act on any employeeId, but an employee only on their own.
export const requireSelfOrAdmin =
  (paramName: string) => (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === "admin") return next();
    if (req.user?.role === "employee" && req.user.id === req.params[paramName]) return next();
    return next(forbidden());
  };

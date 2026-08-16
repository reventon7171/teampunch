import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type Role = "admin" | "employee";

export interface TokenPayload {
  sub: string; // admin id or employee id
  role: Role;
  orgId: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });

export const verifyToken = (token: string): TokenPayload => jwt.verify(token, env.JWT_SECRET) as TokenPayload;

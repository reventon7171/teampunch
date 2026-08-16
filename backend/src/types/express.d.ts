import { Role } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        organizationId: string;
      };
    }
  }
}

export {};

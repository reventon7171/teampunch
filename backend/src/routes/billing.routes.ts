import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { serializeBilling } from "../lib/serialize";

// Read-only for now — no payment gateway is wired up yet, so there's nothing to change here.
// plan/subscriptionStatus/isLifetimeFree are set directly in the database until billing exists.
const router = Router();
router.use(requireAuth);
router.use(requireRole("admin"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.user!.organizationId } });
    res.json(serializeBilling(org));
  })
);

export default router;

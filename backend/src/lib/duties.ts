import { PrismaClient } from "@prisma/client";

// picks a random ACTIVE duty task option from the admin-managed list; returns null if the
// admin hasn't set any up yet (or deactivated all of them) — callers treat that as "skip
// duty assignment this check-in" rather than erroring
export const pickRandomDutyOption = async (prisma: PrismaClient, organizationId: string) => {
  const options = await prisma.dutyTaskOption.findMany({ where: { active: true, organizationId } });
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
};

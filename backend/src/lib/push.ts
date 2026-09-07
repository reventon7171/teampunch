import { prisma } from "./prisma";

// Fire-and-forget: a failed or slow push send should never block the employee action (leave/
// OT/day-off-swap request) that triggered it, so every caller of sendPushToAdmins should NOT
// await it inline in the response path — call it and let it run, only log failures.
export const sendPushToAdmins = async (
  organizationId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  const rows = await prisma.adminPushToken.findMany({
    where: { admin: { organizationId } },
    select: { id: true, token: true },
  });
  if (rows.length === 0) return;

  const messages = rows.map((row) => ({
    to: row.token,
    title,
    body,
    sound: "default",
    priority: "high",
    data: data ?? {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
    const tickets = json.data ?? [];

    // A push token stops being valid when the device unregisters (uninstall, OS revoke) —
    // Expo reports this per-message instead of erroring the whole batch, so prune just those
    // rows rather than leaving dead tokens to fail silently on every future notification.
    const deadTokenIds = tickets
      .map((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? rows[i]?.id : null))
      .filter((id): id is string => !!id);
    if (deadTokenIds.length > 0) {
      await prisma.adminPushToken.deleteMany({ where: { id: { in: deadTokenIds } } });
    }
  } catch (err) {
    console.error("[push] send failed:", err);
  }
};

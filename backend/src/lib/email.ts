import { Resend } from "resend";
import { env } from "../config/env";

const isEmailConfigured = (): boolean => !!env.RESEND_API_KEY;

let client: Resend | null = null;
const getClient = (): Resend => {
  if (client) return client;
  client = new Resend(env.RESEND_API_KEY);
  return client;
};

// Fire-and-forget-ish: callers await this to know if the send call itself failed, but a
// missing RESEND_API_KEY is not an error — it just logs, so local dev never needs a real key.
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!isEmailConfigured()) {
    console.log(`[email] RESEND_API_KEY not set — would have sent to ${to}: ${subject}`);
    return;
  }
  const { error } = await getClient().emails.send({ from: env.RESEND_FROM_EMAIL, to, subject, html });
  if (error) {
    console.error("[email] send failed:", error);
    throw new Error("ส่งอีเมลไม่สำเร็จ");
  }
};

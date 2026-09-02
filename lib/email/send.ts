import "server-only";
import { Resend } from "resend";

// Sends from the domain provisioned in Resend for this account — must be
// verified there (Domains → Add Domain) before delivery will actually work;
// until then Resend rejects the send and we just log it (see below).
const FROM = "Alkhair Microcredit <notifications@alkhair.ng>";

let client: Resend | null = null;
function getResend() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

// A bare HTML-only email (no plain-text alternative) is itself a mild spam
// signal to most filters — this is a plain-tags-stripped fallback, not a
// hand-written one, but it's enough to avoid that penalty.
function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|tr|div|h1|h2|h3)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// A notification failing to send should never break the action that
// triggered it (creating a client, approving a loan, etc.) — this always
// resolves, logging the failure instead of throwing.
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not configured — skipped "${params.subject}" to ${params.to}`);
    return;
  }
  try {
    const result = await getResend().emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: htmlToText(params.html),
    });
    if (result.error) {
      console.error(`[email] Resend rejected "${params.subject}" to ${params.to}:`, result.error);
    }
  } catch (err) {
    console.error(`[email] Failed to send "${params.subject}" to ${params.to}:`, err);
  }
}

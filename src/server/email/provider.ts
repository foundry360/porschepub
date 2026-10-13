import "server-only";
import { getEmailConfig } from "@/server/env";

export type OutboundEmail = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailSendResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "failed"; reason: string };

export interface EmailProvider {
  send(message: OutboundEmail): Promise<EmailSendResult>;
}

/**
 * Resend over plain HTTPS (no SDK). To change provider, implement
 * `EmailProvider` and return it from `getEmailProvider()`.
 */
export class ResendProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: OutboundEmail): Promise<EmailSendResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        // Do not echo the response body: it may include addresses.
        return { status: "failed", reason: `provider responded ${response.status}` };
      }
      return { status: "sent" };
    } catch (error) {
      const reason = error instanceof Error ? error.name : "unknown error";
      return { status: "failed", reason: `request failed (${reason})` };
    }
  }
}

class UnconfiguredProvider implements EmailProvider {
  async send(): Promise<EmailSendResult> {
    return { status: "skipped", reason: "not_configured" };
  }
}

export function getEmailProvider(): EmailProvider {
  const config = getEmailConfig();
  if (!config) return new UnconfiguredProvider();
  return new ResendProvider(config.apiKey, config.from);
}

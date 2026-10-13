import { brand } from "@/config/brand";
import { absoluteUrl } from "@/lib/urls";
import { escapeHtml } from "@/lib/validation/text";

export type SubmissionNotice = {
  id: string;
  name: string;
  email: string;
  title: string;
  subject: string;
  categoryName: string | null;
  pitchExcerpt: string;
  photoCount?: number;
};

/** Plain, escaped editorial notification. Contains an excerpt, not the full pitch. */
export function newSubmissionEmail(notice: SubmissionNotice) {
  const reviewUrl = absoluteUrl(`/admin/submissions/${notice.id}`);
  const subject = `[${brand.shortName}] New story pitch: ${notice.title}`.slice(0, 200);

  const text = [
    `A new story pitch was submitted.`,
    ``,
    `Title: ${notice.title}`,
    `Subject: ${notice.subject}`,
    `Category: ${notice.categoryName ?? "-"}`,
    `From: ${notice.name} <${notice.email}>`,
    `Photos: ${notice.photoCount ?? 0}`,
    ``,
    `Excerpt:`,
    notice.pitchExcerpt,
    ``,
    `Review it: ${reviewUrl}`,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#595959;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;color:#000000;line-height:1.5">
<h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 12px">New story pitch</h2>
<table style="border-collapse:collapse;font-size:14px">
${row("Title", notice.title)}
${row("Subject", notice.subject)}
${row("Category", notice.categoryName ?? "-")}
${row("From", `${notice.name} <${notice.email}>`)}
${row("Photos", String(notice.photoCount ?? 0))}
</table>
<p style="margin:16px 0 4px;color:#595959;font-size:13px">Excerpt</p>
<blockquote style="margin:0;padding-left:12px;border-left:2px solid #c31d14;white-space:pre-wrap">${escapeHtml(notice.pitchExcerpt)}</blockquote>
<p style="margin-top:20px"><a href="${escapeHtml(reviewUrl)}">Review this pitch</a></p>
</body></html>`;

  return { subject, text, html };
}

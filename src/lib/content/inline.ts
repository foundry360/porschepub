/**
 * Minimal, safe inline formatting for editorial text.
 *
 * Authors can use:  **bold**   *italic*   [link text](https://example.com)
 * Output is a token list rendered by React components, never raw HTML, so there
 * is no HTML injection surface. Links are restricted to https, http, mailto and
 * site-relative paths.
 */

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "link"; text: string; href: string; external: boolean };

const SAFE_LINK = /^(https?:\/\/|mailto:|\/(?!\/))/i;

export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return false;
  // Reject control characters and whitespace anywhere in the URL.
   
  if (/[\u0000-\u0020\u007f]/.test(trimmed)) return false;
  return SAFE_LINK.test(trimmed);
}

// Emphasis follows the CommonMark rule that the opening marker is not followed by
// whitespace and the closing marker is not preceded by it, so "2 * 3 * 4" stays literal.
const TOKEN_PATTERN =
  /\[([^\]\n]{1,300})\]\(([^)\s]{1,2000})\)|\*\*(?!\s)([^*\n]{1,2000}?)(?<!\s)\*\*|\*(?!\s)([^*\n]{1,2000}?)(?<!\s)\*/g;

export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "text", text: input.slice(cursor, index) });

    const [whole, linkText, linkHref, strong, em] = match;
    if (linkText !== undefined && linkHref !== undefined) {
      if (isSafeHref(linkHref)) {
        tokens.push({
          type: "link",
          text: linkText,
          href: linkHref,
          external: /^https?:\/\//i.test(linkHref),
        });
      } else {
        // Unsafe URL: keep the visible text, drop the link.
        tokens.push({ type: "text", text: linkText });
      }
    } else if (strong !== undefined) {
      tokens.push({ type: "strong", text: strong });
    } else if (em !== undefined) {
      tokens.push({ type: "em", text: em });
    } else {
      tokens.push({ type: "text", text: whole });
    }
    cursor = index + whole.length;
  }

  if (cursor < input.length) tokens.push({ type: "text", text: input.slice(cursor) });
  return tokens;
}

/** Strip inline markup to plain text (search index, reading time, meta text). */
export function inlineToPlainText(input: string): string {
  return parseInline(input)
    .map((token) => token.text)
    .join("");
}

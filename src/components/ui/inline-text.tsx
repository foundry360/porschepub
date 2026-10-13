import Link from "next/link";
import { parseInline } from "@/lib/content/inline";

/** Renders the safe inline mini-markup as React nodes (never as raw HTML). */
export function InlineText({ text }: { text: string }) {
  const tokens = parseInline(text);
  return (
    <>
      {tokens.map((token, index) => {
        switch (token.type) {
          case "text":
            return <span key={index}>{token.text}</span>;
          case "strong":
            return <strong key={index}>{token.text}</strong>;
          case "em":
            return <em key={index}>{token.text}</em>;
          case "link":
            return token.external ? (
              <a
                key={index}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="link-underline"
              >
                {token.text}
              </a>
            ) : token.href.startsWith("mailto:") ? (
              <a key={index} href={token.href} className="link-underline">
                {token.text}
              </a>
            ) : (
              <Link key={index} href={token.href} className="link-underline">
                {token.text}
              </Link>
            );
        }
      })}
    </>
  );
}

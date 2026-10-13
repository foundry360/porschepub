import Link from "next/link";

/**
 * Crawlable pagination: real links with rel="prev"/"next" semantics through
 * aria labels. `hrefFor` produces the shareable URL for a page number.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  label = "Pagination",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const window = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...window].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label={label} className="mt-16 flex items-center justify-between border-t border-line pt-6">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className="eyebrow link-underline">
          ← Newer
        </Link>
      ) : (
        <span aria-hidden className="eyebrow text-mist">
          ← Newer
        </span>
      )}
      <ul className="flex items-center gap-1 text-sm">
        {pages.map((n, index) => (
          <li key={n} className="flex items-center">
            {index > 0 && n - pages[index - 1] > 1 ? (
              <span aria-hidden className="px-2 text-mist">
                …
              </span>
            ) : null}
            {n === page ? (
              <span aria-current="page" className="flex h-9 min-w-9 items-center justify-center bg-ink px-2 text-paper">
                {n}
              </span>
            ) : (
              <Link
                href={hrefFor(n)}
                aria-label={`Page ${n}`}
                className="flex h-9 min-w-9 items-center justify-center px-2 hover:bg-paper-deep"
              >
                {n}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className="eyebrow link-underline">
          Older →
        </Link>
      ) : (
        <span aria-hidden className="eyebrow text-mist">
          Older →
        </span>
      )}
    </nav>
  );
}

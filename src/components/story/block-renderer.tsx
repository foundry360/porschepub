import { embedUrl, type Block } from "@/lib/content/blocks";
import type { MediaImage } from "@/lib/types";
import { CameraIcon } from "@/components/ui/camera-icon";
import { EditorialImage } from "@/components/ui/editorial-image";
import { InlineText } from "@/components/ui/inline-text";

type Props = {
  blocks: readonly Block[];
  images: Record<string, MediaImage>;
  /** "story" gets the drop cap and wide/full image layouts; "page" is plainer. */
  variant?: "story" | "page";
};

function Figure({
  image,
  caption,
  layout,
}: {
  image: MediaImage;
  caption: string | null;
  layout: "inline" | "wide" | "full";
}) {
  // Body images share one size (same as "My First Porsche"): slightly wider than
  // the text column. Only "full" breaks to the viewport edge.
  const sizes = layout === "full" ? "100vw" : "(min-width: 768px) 800px, 100vw";

  return (
    <figure
      className={
        layout === "full"
          ? "story-full relative left-1/2 my-14 w-screen -translate-x-1/2"
          : "my-10 sm:-mx-8 md:-mx-12"
      }
    >
      <EditorialImage
        image={image}
        sizes={sizes}
        className={`reveal-on-scroll ${layout === "full" ? "" : "rounded-lg"}`}
        reveal={false}
      />
      {caption || image.credit ? (
        <figcaption className="mx-auto mt-3 max-w-[44rem] px-5 text-[0.85rem] leading-snug text-stone sm:px-0">
          {caption ? <span>{caption}</span> : null}
          {image.credit ? (
            <span className="flex items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.08em] text-stone">
              <CameraIcon />
              {image.credit}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Renders structured blocks with semantic HTML. Unknown/invalid blocks never
 * reach this component (they are filtered when the body is parsed).
 */
export function BlockRenderer({ blocks, images, variant = "story" }: Props) {
  return (
    <div className={variant === "story" ? "story-body" : "page-prose text-[1.0625rem] leading-relaxed"}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={index}>
                <InlineText text={block.text} />
              </p>
            );
          case "heading":
            return block.level === 2 ? (
              <h2 key={index}>
                <InlineText text={block.text} />
              </h2>
            ) : (
              <h3 key={index}>
                <InlineText text={block.text} />
              </h3>
            );
          case "quote":
            return (
              <blockquote key={index}>
                <p>
                  <InlineText text={block.text} />
                </p>
                {block.attribution ? (
                  <footer className="mt-3 text-[0.8rem] font-sans not-italic uppercase tracking-[0.12em] text-stone">
                    {block.attribution}
                  </footer>
                ) : null}
              </blockquote>
            );
          case "pullquote":
            return (
              <aside
                key={index}
                aria-label="Pull quote"
                className="my-14 border-l-2 border-accent py-1 pl-6 sm:pl-8 lg:-ml-[4vw]"
              >
                <p className="font-display text-[2rem] italic leading-[1.15] text-ink sm:text-[2.75rem]">
                  “<InlineText text={block.text} />”
                </p>
                {block.attribution ? (
                  <p className="eyebrow mt-5 text-stone">{block.attribution}</p>
                ) : null}
              </aside>
            );
          case "image": {
            const image = images[block.assetId];
            if (!image) return null;
            return (
              <Figure
                key={index}
                image={image}
                caption={block.caption ?? image.caption}
                layout={block.layout}
              />
            );
          }
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineText text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "divider":
            return (
              <hr key={index} className="mx-auto my-12 w-16 border-0 border-t border-ink" />
            );
          case "embed":
            return (
              <figure key={index} className="my-10">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-ink">
                  <iframe
                    src={embedUrl(block)}
                    title={block.title}
                    loading="lazy"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
                {block.caption ? (
                  <figcaption className="mt-3 text-[0.85rem] text-stone">{block.caption}</figcaption>
                ) : null}
              </figure>
            );
        }
      })}
    </div>
  );
}

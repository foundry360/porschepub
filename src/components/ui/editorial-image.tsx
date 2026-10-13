import Image from "next/image";
import type { MediaImage } from "@/lib/types";

type Props = {
  image: MediaImage;
  sizes: string;
  /** Load eagerly with high priority; use only for the LCP image on a page. */
  priority?: boolean;
  /** Fixed crop ratio, e.g. "4/5". Omit to keep the natural aspect ratio. */
  aspect?: string;
  className?: string;
  imageClassName?: string;
  reveal?: boolean;
  /** Decorative duplicates (e.g. a card image next to its linked headline). */
  decorative?: boolean;
};

/**
 * All editorial photography goes through here: responsive `sizes`, lazy loading
 * by default, an intrinsic aspect ratio (no layout shift), and a restrained
 * reveal animation.
 */
export function EditorialImage({
  image,
  sizes,
  priority = false,
  aspect,
  className = "",
  imageClassName = "",
  reveal = true,
  decorative = false,
}: Props) {
  const style = aspect ? { aspectRatio: aspect } : { aspectRatio: `${image.width} / ${image.height}` };
  return (
    <div className={`relative overflow-hidden bg-paper-deep ${className}`} style={style}>
      <Image
        src={image.url}
        alt={decorative ? "" : image.alt}
        fill
        sizes={sizes}
        preload={priority}
        loading={priority ? undefined : "lazy"}
        className={`object-cover ${reveal ? "reveal-image" : ""} ${imageClassName}`}
      />
    </div>
  );
}

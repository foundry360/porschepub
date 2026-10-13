import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 80_000_000; // decompression-bomb guard
export const MAX_OUTPUT_EDGE = 4000;

const OUTPUT_FORMATS = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  avif: { mime: "image/avif", ext: "avif" },
} as const;

export type ProcessedImage = {
  buffer: Buffer;
  mime: (typeof OUTPUT_FORMATS)[keyof typeof OUTPUT_FORMATS]["mime"];
  ext: string;
  width: number;
  height: number;
  byteSize: number;
};

export class ImageRejectedError extends Error {}

/**
 * Validate and normalise an uploaded image.
 *  - Trusts the file CONTENT (magic bytes via sharp), never the filename or
 *    client-supplied type; SVG and everything outside the allow-list is refused.
 *  - Applies EXIF orientation, then strips all metadata (location, device, etc.).
 *  - Caps the long edge so oversized originals never reach the public site.
 */
export type ImageFormat = keyof typeof OUTPUT_FORMATS;

const FORMAT_NAMES: Record<ImageFormat, string> = { jpeg: "JPEG", png: "PNG", webp: "WebP", avif: "AVIF" };

function formatList(formats: readonly ImageFormat[]): string {
  const names = formats.map((format) => FORMAT_NAMES[format]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0];
}

export async function processImage(
  input: Buffer,
  allowed: readonly ImageFormat[] = ["jpeg", "png", "webp", "avif"],
): Promise<ProcessedImage> {
  if (input.byteLength === 0) throw new ImageRejectedError("The file is empty.");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejectedError("The file is larger than 15 MB.");

  let format: string | undefined;
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    format = meta.format;
  } catch {
    throw new ImageRejectedError("That file isn’t a readable image.");
  }
  if (!format || !allowed.includes(format as ImageFormat)) {
    throw new ImageRejectedError(`Use a ${formatList(allowed)} image.`);
  }
  const target = OUTPUT_FORMATS[format as keyof typeof OUTPUT_FORMATS];

  try {
    let pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // applies EXIF orientation; output carries no metadata by default
      .resize({ width: MAX_OUTPUT_EDGE, height: MAX_OUTPUT_EDGE, fit: "inside", withoutEnlargement: true });

    pipeline =
      format === "jpeg"
        ? pipeline.jpeg({ quality: 88, mozjpeg: true })
        : format === "png"
          ? pipeline.png({ compressionLevel: 9 })
          : format === "webp"
            ? pipeline.webp({ quality: 88 })
            : pipeline.avif({ quality: 70 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      mime: target.mime,
      ext: target.ext,
      width: info.width,
      height: info.height,
      byteSize: data.byteLength,
    };
  } catch {
    throw new ImageRejectedError("That image could not be processed. Try exporting it again as a JPEG.");
  }
}

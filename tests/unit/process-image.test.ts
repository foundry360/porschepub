import sharp, { type Sharp } from "sharp";
import { describe, expect, it } from "vitest";
import { ImageRejectedError, MAX_OUTPUT_EDGE, processImage } from "@/server/media/process-image";

async function jpeg(width = 800, height = 600, extra: (s: Sharp) => Sharp = (s) => s) {
  return extra(sharp({ create: { width, height, channels: 3, background: { r: 10, g: 80, b: 140 } } })).jpeg().toBuffer();
}

describe("processImage", () => {
  it("strips EXIF metadata including camera and copyright strings", async () => {
    const input = await jpeg(800, 600, (s) => s.withExif({ IFD0: { Make: "SecretCameraCo", Copyright: "leak-check" } }));
    expect(input.includes(Buffer.from("SecretCameraCo"))).toBe(true); // sanity: the fixture really has it
    const out = await processImage(input);
    expect(out.buffer.includes(Buffer.from("SecretCameraCo"))).toBe(false);
    expect(out.buffer.includes(Buffer.from("leak-check"))).toBe(false);
    expect((await sharp(out.buffer).metadata()).exif).toBeUndefined();
  });

  it("applies EXIF orientation before stripping it", async () => {
    const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#888" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const out = await processImage(input);
    expect(out.width).toBe(200);
    expect(out.height).toBe(400);
  });

  it("caps the long edge but never enlarges", async () => {
    const big = await processImage(await jpeg(6000, 3000));
    expect(Math.max(big.width, big.height)).toBe(MAX_OUTPUT_EDGE);
    expect(big.width / big.height).toBeCloseTo(2, 1);
    const small = await processImage(await jpeg(300, 200));
    expect(small.width).toBe(300);
  });

  it("reports the real output size and mime type", async () => {
    const out = await processImage(await jpeg());
    expect(out.mime).toBe("image/jpeg");
    expect(out.ext).toBe("jpg");
    expect(out.byteSize).toBe(out.buffer.byteLength);
  });

  it("keeps PNG and WebP formats", async () => {
    const png = await sharp({ create: { width: 50, height: 50, channels: 4, background: "#fff" } }).png().toBuffer();
    expect((await processImage(png)).mime).toBe("image/png");
    const webp = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#fff" } }).webp().toBuffer();
    expect((await processImage(webp)).mime).toBe("image/webp");
  });

  it("refuses SVG, GIF, text, empty and truncated files by content, not name", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).gif().toBuffer();
    const truncated = (await jpeg()).subarray(0, 200);
    for (const [label, input] of [
      ["svg", svg],
      ["gif", gif],
      ["text", Buffer.from("definitely not an image")],
      ["empty", Buffer.alloc(0)],
      ["truncated", truncated],
    ] as const) {
      await expect(processImage(input), label).rejects.toBeInstanceOf(ImageRejectedError);
    }
  });

  it("refuses files over the size limit", async () => {
    await expect(processImage(Buffer.alloc(15 * 1024 * 1024 + 1))).rejects.toThrow(/15 MB/);
  });
});

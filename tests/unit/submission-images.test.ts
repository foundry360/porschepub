import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { SUBMISSION_IMAGE_LIMITS } from "@/lib/validation/submission";
import { checkImageSizes, prepareSubmissionImages } from "@/server/submissions/images";

const L = SUBMISSION_IMAGE_LIMITS;

function image(format: "jpeg" | "png" | "avif" = "jpeg") {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: "#335577" } })
    .withExif({ IFD0: { Make: "SecretCameraCo" } })
    .toFormat(format)
    .toBuffer();
}

describe("checkImageSizes", () => {
  it("accepts no photos and a full set within limits", () => {
    expect(checkImageSizes([])).toBeNull();
    expect(checkImageSizes(Array(L.maxCount).fill(500_000))).toBeNull();
  });

  it("rejects too many, empty, oversized or too-large-in-total photos", () => {
    expect(checkImageSizes(Array(L.maxCount + 1).fill(1000))).toMatch(/no more than/);
    expect(checkImageSizes([1000, 0])).toMatch(/empty/);
    expect(checkImageSizes([L.maxBytesEach + 1])).toMatch(/too large/);
    expect(checkImageSizes(Array(L.maxCount).fill(L.maxBytesEach))).toMatch(/too large/);
  });
});

describe("prepareSubmissionImages", () => {
  it("re-encodes photos and strips their metadata", async () => {
    const result = await prepareSubmissionImages([await image(), await image("png")]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.images.map((i) => i.mime)).toEqual(["image/jpeg", "image/png"]);
    for (const out of result.images) expect(out.buffer.includes(Buffer.from("SecretCameraCo"))).toBe(false);
  });

  it("rejects files that are not images, naming the photo", async () => {
    const result = await prepareSubmissionImages([await image(), Buffer.from("<svg onload=alert(1)>")]);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/^Photo 2: /) });
  });

  it("rejects formats outside the stored allow-list", async () => {
    const result = await prepareSubmissionImages([await image("avif")]);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/JPEG, PNG or WebP/) });
  });
});

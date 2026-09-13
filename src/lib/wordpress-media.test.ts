import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { compressWordPressImage } from "./wordpress-media.ts";

const g = globalThis as unknown as {
  FileReader: unknown;
  Image: unknown;
  document: unknown;
};

describe("WordPress Media Compression (src/lib/wordpress-media.ts)", () => {
  const originalFileReader = g.FileReader;
  const originalImage = g.Image;
  const originalDocument = g.document;

  afterEach(() => {
    // Restore global browser objects
    if (originalFileReader) {
      g.FileReader = originalFileReader;
    } else {
      delete g.FileReader;
    }

    if (originalImage) {
      g.Image = originalImage;
    } else {
      delete g.Image;
    }

    if (originalDocument) {
      g.document = originalDocument;
    } else {
      delete g.document;
    }
  });

  it("1. preserves SVG images as-is without canvas rasterization", async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    const file = new File([svgContent], "icon.svg", { type: "image/svg+xml" });

    const result = await compressWordPressImage(file);
    assert.equal(result.filename, "icon.svg");
    assert.equal(result.mimeType, "image/svg+xml");
    assert.equal(result.originalBytes, result.compressedBytes);
    assert.equal(result.contentBase64, Buffer.from(svgContent).toString("base64"));
  });

  it("2. safely processes non-image files as fallback stream without canvas execution", async () => {
    const textContent = "hello world payload";
    const file = new File([textContent], "document.txt", { type: "text/plain" });

    const result = await compressWordPressImage(file);
    assert.equal(result.filename, "document.txt");
    assert.equal(result.mimeType, "text/plain");
    assert.equal(result.originalBytes, result.compressedBytes);
    assert.equal(result.contentBase64, Buffer.from(textContent).toString("base64"));
  });

  it("3. scales down raster images exceeding 1920px max dimension and converts to WebP", async () => {
    let capturedWidth = 0;
    let capturedHeight = 0;
    let capturedQuality = 0;
    let capturedType = "";

    // Mock FileReader
    class MockFileReader {
      result = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.FileReader = MockFileReader;

    // Mock Image with 3840x2160 resolution
    class MockImage {
      naturalWidth = 3840;
      naturalHeight = 2160;
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.Image = MockImage;

    // Mock Document & Canvas
    const webpBytes = new Uint8Array([1, 2, 3, 4, 5]);
    g.document = {
      createElement(tag: string) {
        if (tag === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext(type: string) {
              if (type === "2d") {
                return {
                  drawImage: () => {},
                };
              }
              return null;
            },
            toBlob(callback: (b: Blob | null) => void, type?: string, quality?: number) {
              capturedType = type || "";
              capturedQuality = quality || 0;
              capturedWidth = this.width;
              capturedHeight = this.height;
              callback(new Blob([webpBytes], { type: "image/webp" }));
            },
          };
        }
        return {};
      },
    };

    const originalData = new Uint8Array(2000);
    const file = new File([originalData], "hero-banner.jpg", { type: "image/jpeg" });

    const result = await compressWordPressImage(file);

    // Assert max dimension scaled to 1920 (scale = 1920 / 3840 = 0.5)
    assert.equal(capturedWidth, 1920);
    assert.equal(capturedHeight, 1080);
    assert.equal(capturedType, "image/webp");
    assert.equal(capturedQuality, 0.82);
    assert.equal(result.filename, "hero-banner.webp");
    assert.equal(result.mimeType, "image/webp");
    assert.equal(result.compressedBytes, 5);
    assert.equal(result.contentBase64, Buffer.from(webpBytes).toString("base64"));
  });

  it("4. keeps 1:1 scale for smaller images under 1920px", async () => {
    let capturedWidth = 0;
    let capturedHeight = 0;

    class MockFileReader {
      result = "data:image/png;base64,iVBORw0KGgo=";
      onload: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.FileReader = MockFileReader;

    class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.Image = MockImage;

    const webpBytes = new Uint8Array([8, 9, 10]);
    g.document = {
      createElement(tag: string) {
        if (tag === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: () => {} }),
            toBlob: function (cb: (b: Blob | null) => void) {
              capturedWidth = this.width;
              capturedHeight = this.height;
              cb(new Blob([webpBytes], { type: "image/webp" }));
            },
          };
        }
        return {};
      },
    };

    const file = new File([new Uint8Array(100)], "logo.png", { type: "image/png" });
    const result = await compressWordPressImage(file);

    assert.equal(capturedWidth, 800);
    assert.equal(capturedHeight, 600);
    assert.equal(result.filename, "logo.webp");
    assert.equal(result.mimeType, "image/webp");
  });

  it("5. safely falls back to original bytes when browser does not support WebP toBlob", async () => {
    class MockFileReader {
      result = "data:image/jpeg;base64,...";
      onload: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.FileReader = MockFileReader;

    class MockImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.Image = MockImage;

    // Canvas toBlob returns null (WebP not supported in browser)
    g.document = {
      createElement: () => ({
        getContext: () => ({ drawImage: () => {} }),
        toBlob: (cb: (b: Blob | null) => void) => cb(null),
      }),
    };

    const original = new Uint8Array([11, 22, 33, 44]);
    const file = new File([original], "photo.jpg", { type: "image/jpeg" });
    const result = await compressWordPressImage(file);

    assert.equal(result.filename, "photo.jpg");
    assert.equal(result.mimeType, "image/jpeg");
    assert.equal(result.compressedBytes, 4);
    assert.equal(result.contentBase64, Buffer.from(original).toString("base64"));
  });

  it("6. safely falls back to original bytes if image decoding throws an error", async () => {
    class MockFileReader {
      result = "corrupt-data";
      onload: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    g.FileReader = MockFileReader;

    class MockImage {
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
    g.Image = MockImage;

    const original = new Uint8Array([99, 88, 77]);
    const file = new File([original], "corrupted.png", { type: "image/png" });
    const result = await compressWordPressImage(file);

    assert.equal(result.filename, "corrupted.png");
    assert.equal(result.mimeType, "image/png");
    assert.equal(result.contentBase64, Buffer.from(original).toString("base64"));
  });

  it("7. correctly encodes large binary buffers without call stack overflow", async () => {
    // 70,000 bytes (larger than 0x8000 chunk threshold)
    const largeSize = 70_000;
    const largeBytes = new Uint8Array(largeSize);
    for (let i = 0; i < largeSize; i++) {
      largeBytes[i] = i % 256;
    }

    const file = new File([largeBytes], "large-vector.svg", { type: "image/svg+xml" });
    const result = await compressWordPressImage(file);

    const expectedBase64 = Buffer.from(largeBytes).toString("base64");
    assert.equal(result.contentBase64, expectedBase64);
    assert.equal(result.compressedBytes, largeSize);
  });
});

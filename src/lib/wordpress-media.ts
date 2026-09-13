const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

type CompressedMedia = {
  filename: string;
  mimeType: string;
  contentBase64: string;
  originalBytes: number;
  compressedBytes: number;
};

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Súbor sa nepodarilo načítať."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Obrázok sa nepodarilo dekódovať."));
    image.src = dataUrl;
  });
}

/**
 * Compresses raster images in-browser so WordPress receives a bounded WebP.
 * SVGs and browsers without WebP support fall back to the original bytes.
 */
export async function compressWordPressImage(file: File): Promise<CompressedMedia> {
  const originalBytes = file.size;
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64: base64FromBytes(bytes),
      originalBytes,
      compressedBytes: bytes.byteLength,
    };
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Prehliadač nepodporuje spracovanie obrázka.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
      );
      if (!blob || blob.type !== "image/webp") {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: base64FromBytes(bytes),
          originalBytes,
          compressedBytes: bytes.byteLength,
        };
      }

      const bytes = new Uint8Array(await blob.arrayBuffer());
      const stem = file.name.replace(/\.[^.]+$/, "") || "image";
      return {
        filename: `${stem}.webp`,
        mimeType: "image/webp",
        contentBase64: base64FromBytes(bytes),
        originalBytes,
        compressedBytes: bytes.byteLength,
      };
    } finally {
      image.onload = null;
      image.onerror = null;
      image.src = "";
    }
  } catch {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64: base64FromBytes(bytes),
      originalBytes,
      compressedBytes: bytes.byteLength,
    };
  }
}

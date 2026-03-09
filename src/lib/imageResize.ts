const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class ImageTooLargeError extends Error {
  constructor() {
    super("Image must be under 5MB");
    this.name = "ImageTooLargeError";
  }
}

/**
 * Resize an image file to max 1920px wide, output as JPEG blob.
 * Throws ImageTooLargeError if original file exceeds 5MB.
 */
export async function resizeImage(file: File): Promise<Blob> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageTooLargeError();
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate new dimensions
  let newWidth = width;
  let newHeight = height;
  if (width > MAX_WIDTH) {
    newWidth = MAX_WIDTH;
    newHeight = Math.round((height * MAX_WIDTH) / width);
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  // Convert to JPEG blob
  return await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
}

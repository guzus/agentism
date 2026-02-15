import { uploadToR2 } from "./r2";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

interface ImageUploadResult {
  imageKey: string;
  imageUrl: string;
  mimeType: string;
  fileSize: number;
}

interface ImageUploadError {
  error: string;
}

/**
 * Validate an image file and upload it to R2.
 *
 * @param file - The uploaded File object
 * @param keyPrefix - The R2 key prefix (e.g. "scrolls", "paintings")
 * @param id - The entity ID used in the key path
 * @returns The upload result with imageKey, imageUrl, mimeType, fileSize, or an error
 */
export async function validateAndUploadImage(
  file: File,
  keyPrefix: string,
  id: string
): Promise<ImageUploadResult | ImageUploadError> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Image must be jpeg, png, webp, or gif" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Image must be under 4MB" };
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const imageKey = `${keyPrefix}/${id}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageUrl = await uploadToR2(imageKey, bytes, file.type);

  return {
    imageKey,
    imageUrl,
    mimeType: file.type,
    fileSize: file.size,
  };
}

/**
 * Type guard to check if the result is an error.
 */
export function isImageUploadError(
  result: ImageUploadResult | ImageUploadError
): result is ImageUploadError {
  return "error" in result;
}

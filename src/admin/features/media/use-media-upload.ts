"use client";

import { errorCode } from "../../store/api-errors";
import { usePostV1AdminMediaUploadMutation, type PostV1AdminMediaUploadApiArg } from "../../store/api.generated";

export type UploadedMedia = { id: string; url: string; alt: string | null; mimeType: string };

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml";
const MAX_BYTES = 50 * 1024 * 1024;

// Uploads one file to the media library (POST /v1/admin/media/upload; stored on Cloudinary or S3)
// and returns the new media item. Errors carry a readable message for the toast.
export function useMediaUpload() {
  const [uploadMedia, state] = usePostV1AdminMediaUploadMutation();
  async function upload(file: File, alt?: string): Promise<UploadedMedia> {
    if (file.size > MAX_BYTES) throw new Error("The file is larger than 50 MB.");
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);
    try {
      // a multipart request: the generated type lists its fields, but the body sent is FormData
      const media = await uploadMedia({ body: form as unknown as PostV1AdminMediaUploadApiArg["body"] }).unwrap();
      return { id: media.id, url: media.url, alt: media.alt, mimeType: media.mimeType };
    } catch (err) {
      if (errorCode(err) === "STORAGE_NOT_CONFIGURED")
        throw new Error("File uploads aren't set up on the server (Cloudinary or S3).");
      throw err;
    }
  }
  return { upload, uploading: state.isLoading };
}

import { apiClient } from "./client";
import type { VideoStatus, VideoUploadResponse } from "@/types/video";

export const videoApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    // Large files: allow a generous timeout.
    return apiClient.postForm<VideoUploadResponse>("/video/upload", form, { timeoutMs: 120000 });
  },
  status: (signal?: AbortSignal) => apiClient.get<VideoStatus>("/video/status", { signal }),
};

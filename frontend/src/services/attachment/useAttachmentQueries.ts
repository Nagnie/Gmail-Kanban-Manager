import { useMutation } from "@tanstack/react-query";
import { downloadAttachment } from "./api";
import type { AttachmentDownloadParams } from "./types";

/**
 * Mutation: Download attachment
 * Triggers the download of an attachment file
 */
export const useDownloadAttachmentMutation = () => {
    return useMutation({
        mutationFn: (params: AttachmentDownloadParams) => downloadAttachment(params),
        onSuccess: (data) => {
            // Create blob URL and trigger download
            const url = window.URL.createObjectURL(data.buffer);
            const link = document.createElement("a");
            link.href = url;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
        onError: (error) => {
            console.error("Failed to download attachment:", error);
        },
    });
};

import { apiClient } from "@/services/core/api-client";
import type { AttachmentDownloadParams, AttachmentDownloadResponse } from "./types";

/**
 * Download email attachment
 */
export const downloadAttachment = async (
    params: AttachmentDownloadParams
): Promise<AttachmentDownloadResponse> => {
    const client = apiClient.getClient();

    const queryParams = new URLSearchParams({
        messageId: params.messageId,
        filename: params.filename,
        mimeType: params.mimeType,
    });

    const response = await client.get<Blob>(
        `/api/v1/attachments/${params.attachmentId}?${queryParams.toString()}`,
        {
            responseType: "blob",
        }
    );

    return {
        buffer: response.data,
        filename: params.filename,
        mimeType: params.mimeType,
        size: response.data.size,
    };
};

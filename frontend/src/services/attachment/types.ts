export interface AttachmentDownloadParams {
    attachmentId: string;
    messageId: string;
    filename: string;
    mimeType: string;
}

export interface AttachmentDownloadResponse {
    buffer: Blob;
    filename: string;
    mimeType: string;
    size: number;
}

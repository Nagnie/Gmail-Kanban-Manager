export const attachmentKeys = {
    all: ["attachment"] as const,
    lists: () => [...attachmentKeys.all, "list"] as const,
    downloads: () => [...attachmentKeys.all, "download"] as const,
    download: (attachmentId: string, messageId: string) =>
        [...attachmentKeys.downloads(), attachmentId, messageId] as const,
};

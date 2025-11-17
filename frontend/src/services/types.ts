export interface Email {
    id: number;
    from: string;
    to: string;
    cc?: string;
    subject: string;
    preview: string;
    body: string;
    bodyHtml?: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    attachments?: { name: string; size: string }[];
}

export interface Folder {
    id: string;
    name: string;
    icon: React.ReactNode;
    count?: number;
}

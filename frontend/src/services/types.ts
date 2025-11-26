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

export interface Mailbox {
    id: string;
    name: string;
    unreadCount?: number;
}

export interface Folder {
    id: string;
    name: string;
    icon: React.ReactNode;
    count?: number;
}

export interface DraftEmail {
    id: string;
    to: string;
    subject: string;
    body: string;
    timestamp: string;
}

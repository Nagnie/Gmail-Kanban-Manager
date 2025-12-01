/**
 * Mailbox Types
 */

export interface Mailbox {
    id: string;
    name: string;
    messageListVisibility?: "hide" | "show";
    labelListVisibility?: "labelHide" | "labelShow";
    type: "system" | "user";
    messagesTotal: number;
    messagesUnread: number;
    threadsTotal: number;
    threadsUnread: number;
}

export interface MailboxesResponse {
    status: "success" | "error";
    message: string;
    data: Mailbox[];
    metadata: {
        timestamp: string;
        path: string;
    };
}

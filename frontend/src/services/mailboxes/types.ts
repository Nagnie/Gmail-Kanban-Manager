import type { EmailHeadersDto } from "../kanban/types";

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

export interface EmailHeader {
  subject: string;
  from: string;
  to: string;
  date: string;
}

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface EmailBody {
  htmlBody?: string;
  textBody?: string;
  attachments?: Attachment[];
}

export interface MessageHeaders {
  subject: string;
  cc?: string;
  bcc?: string;
  from: string;
  to: string;
  date: string;
  messageId?: string;
  references?: string;
  inReplyTo?: string;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  headers: MessageHeaders;
  body: EmailBody;
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  internalDate: string;
  sizeEstimate: number;
}

export interface ThreadDetail {
  id: string;
  snippet: string;
  historyId: string;
  messages: ThreadMessage[];
}

export interface EmailMessage {
  id: string;
  subject?: string;
  from?: string;
  hasSummary?: boolean;
  threadId: string;
  labelIds: string[];
  snippet: string;
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
  header: EmailHeader;
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  messageCount?: number;
  participantEmails?: string;
  date?: string;
  headers?: EmailHeadersDto;
  hasAttachments?: boolean;
}

export interface EmailsData {
  nextPageToken?: string;
  resultSizeEstimate: number;
  emails: EmailMessage[];
}

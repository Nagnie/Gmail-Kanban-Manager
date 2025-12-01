import { EmailHeaderDto } from '../../mailbox/dto/email-header.dto';

export class ThreadListItemDto {
  id: string; // original message id
  snippet: string;
  threadId: string; // thread id
  historyId: string; // history id

  labelIds: string[]; // labels applied to the thread

  header: EmailHeaderDto;

  participantEmails: string;

  messageCount: number; // Số messages trong thread

  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;

  internalDate: string;
  sizeEstimate: number;
}

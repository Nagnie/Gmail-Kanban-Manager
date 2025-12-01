import { Injectable } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
// import { getHeaderValue } from 'src/utils/email.util';
import { LabelDto } from './dto/label.dto';
import { EmailListResponseDto } from './dto/email-list-response.dto';
// import { EmailSummaryDto } from './dto/email-summary.dto';
import { ThreadService } from '../thread/thread.service';

@Injectable()
export class MailboxService {
  constructor(
    private readonly gmailService: GmailService,
    private readonly threadService: ThreadService,
  ) {}

  async getLabels(userId: number): Promise<LabelDto[]> {
    const labels = await this.gmailService.listLabels(userId);

    const call = labels.labels?.map(async (label) => {
      const fullLabel = await this.gmailService.getLabel(userId, label.id!);
      return fullLabel as LabelDto;
    });

    const detailedLabels = await Promise.all(call || []);

    return detailedLabels;
  }

  async getLabel(userId: number, labelId: string): Promise<LabelDto> {
    return this.gmailService.getLabel(userId, labelId) as Promise<LabelDto>;
  }

  async getEmailsByLabel(
    userEmail: string,
    userId: number,
    labelId: string,
    query?: string,
    pageToken?: string,
  ): Promise<EmailListResponseDto> {
    // const emails = await this.gmailService.getEmailsByLabel(
    //   userId,
    //   labelId,
    //   query,
    //   pageToken,
    // );

    // const call = emails.messages?.map(async (message) => {
    //   const fullMessage = await this.gmailService.getEmailMetadata(
    //     userId,
    //     message.id!,
    //   );

    //   const { payload, ...rest } = fullMessage;

    //   const rawHeaders = payload?.headers || [];
    //   const headers = {
    //     subject: getHeaderValue(rawHeaders, 'Subject') || '',
    //     from: getHeaderValue(rawHeaders, 'From') || '',
    //     to: getHeaderValue(rawHeaders, 'To') || '',
    //     date: getHeaderValue(rawHeaders, 'Date') || '',
    //   };

    //   const isUnread = fullMessage.labelIds?.includes('UNREAD') || false;
    //   const isStarred = fullMessage.labelIds?.includes('STARRED') || false;
    //   const isImportant = fullMessage.labelIds?.includes('IMPORTANT') || false;

    //   return {
    //     ...rest,
    //     header: headers,
    //     isUnread,
    //     isStarred,
    //     isImportant,
    //   } as EmailSummaryDto;
    // });

    // const detailedEmails = await Promise.all(call || []);

    const detailedEmails = await this.threadService.getThreadsByLabels(
      userEmail,
      userId,
      [labelId],
      query,
      pageToken,
    );

    return {
      nextPageToken: detailedEmails.nextPageToken || undefined,
      resultSizeEstimate: detailedEmails.resultSizeEstimate || 0,
      emails: detailedEmails.threads,
    };
  }
}

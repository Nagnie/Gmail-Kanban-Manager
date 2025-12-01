import { Injectable } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { ThreadDetailDto } from './dto/thread-detail.dto';
import { getHeaderValue, parseEmailDetail } from 'src/utils/email.util';
import { gmail_v1 } from 'googleapis';
import { ThreadListItemDto } from 'src/thread/dto/thread-list-item.dto';
import { ThreadsListResponseDto } from 'src/thread/dto/threads-list-response.dto';

@Injectable()
export class ThreadService {
  constructor(private readonly gmailService: GmailService) {}

  async getThreadDetail(
    userId: number,
    threadId: string,
  ): Promise<ThreadDetailDto> {
    const thread = await this.gmailService.getThread(userId, threadId);
    const messages = (thread.messages || []).map((message) =>
      parseEmailDetail(message),
    );

    return {
      id: thread.id!,
      snippet: thread.snippet || '',
      historyId: thread.historyId || '',
      messages,
    };
  }

  async getThreadsByLabels(
    userEmail: string,
    userId: number,
    labelIds: string[],
    query?: string,
    pageToken?: string,
  ): Promise<ThreadsListResponseDto> {
    const threadsResponse = await this.gmailService.getThreadsByLabels(
      userId,
      labelIds,
      query,
      pageToken,
    );

    const call = threadsResponse.threads?.map(async (thread) => {
      const fullThread = await this.gmailService.getThreadMetadata(
        userId,
        thread.id!,
      );

      return this.parseThreadListItem(fullThread, userEmail);
    });

    const threadListItems = await Promise.all(call || []);

    return {
      threads: threadListItems,
      nextPageToken: threadsResponse.nextPageToken || undefined,
      resultSizeEstimate: threadsResponse.resultSizeEstimate || undefined,
    };
  }

  private parseThreadListItem(
    thread: gmail_v1.Schema$Thread,
    userEmail: string,
  ): ThreadListItemDto {
    const messages = thread.messages || [];
    const firstMessage = messages[0];
    const headers = firstMessage?.payload?.headers || [];

    const lastMessage = messages[messages.length - 1];

    const allLabelIds = new Set<string>();
    messages.forEach((msg) => {
      msg.labelIds?.forEach((labelId) => allLabelIds.add(labelId));
    });

    const participantEmailsSet = new Set<string>();
    messages.forEach((msg) => {
      const msgHeaders = msg.payload?.headers || [];
      const from = getHeaderValue(msgHeaders, 'From');
      // const to = getHeaderValue(msgHeaders, 'To');
      if (from) {
        from.split(',').forEach((email) => {
          let add = email.trim().split('<')[0].trim().replace(/"/g, '');
          const mail = email.trim().split('<')[1]?.replace('>', '').trim();
          console.log('🚀 ~ ThreadService ~ parseThreadListItem ~ add:', add);
          console.log(
            '🚀 ~ ThreadService ~ parseThreadListItem ~ userEmail:',
            userEmail,
          );
          if (
            add === userEmail ||
            userEmail.includes(add) ||
            mail === userEmail
          ) {
            add = 'me';
          }
          if (add) {
            participantEmailsSet.add(add);
          }
        });
      }
      // if (to) {
      //   to.split(',').forEach((email) => {
      //     let add = email.trim().split('<')[0].trim();
      //     if (add === userEmail) {
      //       add = 'Me';
      //     }
      //     participantEmailsSet.add(add);
      //   });
      // }
    });

    const participantEmails = Array.from(participantEmailsSet).join(', ');

    return {
      id: firstMessage.id || '',
      snippet: thread.snippet || lastMessage?.snippet || '',
      threadId: thread.id || '',
      historyId: thread.historyId || '',

      labelIds: Array.from(allLabelIds),

      participantEmails: participantEmails,

      header: {
        subject: getHeaderValue(headers, 'Subject') || '',
        from: getHeaderValue(headers, 'From') || '',
        to: getHeaderValue(headers, 'To') || '',
        date: getHeaderValue(headers, 'Date') || '',
      },

      messageCount: messages.length,

      isUnread: Array.from(allLabelIds).includes('UNREAD') ?? false,
      isStarred: Array.from(allLabelIds).includes('STARRED') ?? false,
      isImportant: Array.from(allLabelIds).includes('IMPORTANT') ?? false,

      internalDate: firstMessage.internalDate || '',
      sizeEstimate: firstMessage.sizeEstimate || 0,
    };
  }
}

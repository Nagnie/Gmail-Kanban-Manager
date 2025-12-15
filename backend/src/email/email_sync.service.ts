import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GmailService } from 'src/gmail/gmail.service';
import { In, Repository } from 'typeorm';
import { Email } from './entities/email.entity';
import { gmail_v1 } from 'googleapis';
import { EmailSyncEvent } from './events/email_sync.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EmailSynceService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
    private readonly gmailService: GmailService,
  ) {}

  public async processAndSaveBatch(
    userId: number,
    messages: gmail_v1.Schema$Message[],
    gmailClient: any,
  ): Promise<void> {
    if (messages.length === 0) return;

    const existingIds = await this.emailRepository.find({
      where: { id: In(messages.map((m) => m.id)) },
      select: ['id'],
    });
    const existingIdSet = new Set(existingIds.map((e) => e.id));
    const messagesToFetch = messages.filter(
      (m) => !existingIdSet.has(m.id || ''),
    );

    if (messagesToFetch.length === 0) return;

    const fetchedEmails = await Promise.all(
      messagesToFetch.map(async (msg) => {
        try {
          const detail = await gmailClient.users.messages.get({
            format: 'metadata',
            id: msg.id!,
            metadataHeaders: ['Subject', 'From', 'Date'],
            userId: 'me',
          });

          const headers: any[] = detail.data.payload?.headers ?? [];
          return {
            id: msg.id!,
            threadId: msg.threadId!,
            snippet: detail.data.snippet ?? '',
            internalDate: detail.data.internalDate ?? '',
            subject: this.getHeader(headers ?? [], 'Subject'),
            sender: this.getHeader(headers ?? [], 'From'),
            userId: userId,
          };
        } catch (e) {
          console.error(`Failed to fetch msg ${msg.id}`, e);
          return null;
        }
      }),
    );
    const validEmails = fetchedEmails.filter((e) => e !== null);
    if (validEmails.length > 0) {
      await this.emailRepository.save(validEmails);
      console.log(`Saved ${validEmails.length} emails for user ${userId}`);
    }
  }

  async syncEmailsForUser(userId: number) {
    const gmail = await this.gmailService.getAuthenticatedGmailClient(userId);

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) return [];
    const nextPageToken = listRes.data.nextPageToken;

    await this.processAndSaveBatch(userId, messages, gmail);

    if (nextPageToken) {
      console.log('Triggering background sync...');
      this.eventEmitter.emit(
        'email.sync',
        new EmailSyncEvent(userId, nextPageToken, 1),
      );
    }

    return this.emailRepository.find({
      where: { userId },
      order: { internalDate: 'DESC' },
      take: 20,
    });
  }

  private getHeader(headers: any[], name: string): string {
    return headers.find((h) => h.name === name)?.value || '';
  }
}

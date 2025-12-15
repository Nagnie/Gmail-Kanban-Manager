import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { GmailService } from '../../gmail/gmail.service';
import { EmailSynceService } from '../email_sync.service';
import { EmailSyncEvent } from '../events/email_sync.event';

@Injectable()
export class EmailSyncListener {
  private readonly logger = new Logger(EmailSyncListener.name);
  private readonly MAX_PAGES = 10;

  constructor(
    private emailSyncService: EmailSynceService,
    private gmailService: GmailService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('email.sync')
  async handleSyncOldEmails(payload: EmailSyncEvent) {
    const { userId, pageToken, pageCount } = payload;

    if (!pageToken || pageCount > this.MAX_PAGES) {
      this.logger.log(
        `Background sync job finished for User ${userId}. Pages: ${pageCount}`,
      );
      return;
    }

    try {
      this.logger.debug(
        `Syncing background page ${pageCount} for User ${userId}...`,
      );

      const gmail = await this.gmailService.getAuthenticatedGmailClient(userId);

      const listRes = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        pageToken: pageToken,
      });

      const messages = listRes.data.messages || [];
      const nextPageToken = listRes.data.nextPageToken;

      await this.emailSyncService.processAndSaveBatch(userId, messages, gmail);

      await this.sleep(1000);

      if (nextPageToken) {
        this.eventEmitter.emit(
          'email.sync',
          new EmailSyncEvent(userId, nextPageToken, pageCount + 1),
        );
      }
    } catch (error) {
      this.logger.error(`Error background sync user ${userId}`, error);
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

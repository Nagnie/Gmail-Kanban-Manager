import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { GmailService } from '../../gmail/gmail.service';
import { EmailSynceService } from '../sync/email_sync.service';
import { SnoozeGateway } from 'src/snooze/snooze.gateway';
import { EmailFullSyncEvent } from '../events/email_full_sync.event';
import { EmailEmbeddingEvent } from '../events/email_embedding.event';

@Injectable()
export class EmailFullSyncListener {
  private readonly logger = new Logger(EmailFullSyncListener.name);
  private readonly MAX_PAGES = 50;

  constructor(
    private emailSyncService: EmailSynceService,
    private gmailService: GmailService,
    private eventEmitter: EventEmitter2,
    private readonly snoozeGateway: SnoozeGateway,
  ) {}

  @OnEvent('email.full-sync', { async: true })
  async handleFullSync(payload: EmailFullSyncEvent) {
    const { userId, pageToken, pageCount } = payload;

    // pageCount = 0 là first batch
    if (pageCount === 0) {
      try {
        this.logger.debug(`Starting full sync for User ${userId}...`);
        const savedIds = await this.emailSyncService.syncFirstBatch(userId);
        this.logger.log(`[Full-Sync] First batch for user ${userId}: saved ${savedIds?.length || 0} emails`);

        if (savedIds && savedIds.length > 0) {
          // Notify frontend about saved email IDs via SnoozeGateway
          this.snoozeGateway.notifyNewEmails(userId.toString(), savedIds);
        }
      } catch (error) {
        this.logger.error(`Error starting full sync for user ${userId}`, error);
      }
      return;
    }

    // Xử lý các pages tiếp theo
    if (!pageToken || pageCount > this.MAX_PAGES) {
      this.logger.log(
        `Full sync job finished for User ${userId}. Pages: ${pageCount}`,
      );
      return;
    }

    try {
      this.logger.debug(`Syncing full page ${pageCount} for User ${userId}...`);

      const gmail = await this.gmailService.getAuthenticatedGmailClient(userId);

      const listRes = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        pageToken: pageToken,
      });

      const messages = listRes.data.messages || [];
      const nextPageToken = listRes.data.nextPageToken;

      const emailIds = await this.emailSyncService.processAndSaveBatch(
        userId,
        messages,
        gmail,
      );

      // Notify frontend about saved email IDs via SnoozeGateway
      if (emailIds.length > 0) {
        this.snoozeGateway.notifyNewEmails(userId.toString(), emailIds);
      }

      // Trigger background embedding generation
      if (emailIds.length > 0) {
        this.logger.debug(
          `Triggering background embedding generation for ${emailIds.length} emails...`,
        );
        this.eventEmitter.emit(
          'email.embedding',
          new EmailEmbeddingEvent(userId, emailIds, 1),
        );
      }

      await this.sleep(1000);

      if (nextPageToken) {
        this.eventEmitter.emit(
          'email.full-sync',
          new EmailFullSyncEvent(userId, nextPageToken, pageCount + 1),
        );
      }
    } catch (error) {
      this.logger.error(`Error full sync user ${userId}`, error);
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

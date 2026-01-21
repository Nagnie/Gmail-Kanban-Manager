import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { GmailService } from '../../gmail/gmail.service';
import { EmailSynceService } from '../sync/email_sync.service';
import { SnoozeGateway } from 'src/snooze/snooze.gateway';
import { EmailSyncEvent } from '../events/email_sync.event';
import { EmailEmbeddingEvent } from '../events/email_embedding.event';

@Injectable()
export class EmailSyncListener {
  private readonly logger = new Logger(EmailSyncListener.name);
  private readonly MAX_PAGES = 10;

  constructor(
    private emailSyncService: EmailSynceService,
    private gmailService: GmailService,
    private eventEmitter: EventEmitter2,
    private readonly snoozeGateway: SnoozeGateway,
  ) {}

  @OnEvent('email.sync', { async: true })
  async handleSyncOldEmails(payload: EmailSyncEvent) {
    const { userId, pageToken, pageCount, deletedEmailIds } = payload;

    // pageCount = 0 là first sync from scheduler
    if (pageCount === 0) {
      try {
        this.logger.log(
          `[User ${userId}] Starting history sync (pageCount=0)...`,
        );
        const { newEmailIds, deletedEmailIds: firstDeletedIds } =
          await this.emailSyncService.syncEmailsWithHistory(userId);

        this.logger.log(
          `[User ${userId}] History sync completed. New: ${newEmailIds.length}, Deleted: ${firstDeletedIds.length}`,
        );

        const allChangedEmailIds = [...newEmailIds, ...firstDeletedIds];

        if (allChangedEmailIds.length > 0) {
          this.logger.log(
            `[User ${userId}] Notifying client about ${allChangedEmailIds.length} changed emails`,
          );
          this.snoozeGateway.notifyNewEmails(
            userId.toString(),
            allChangedEmailIds,
          );
        }

        // Check if there are more pages to sync
        this.logger.log(`[User ${userId}] Checking for next pages...`);
        const historyRes = await this.gmailService.getMailboxHistory(
          userId,
          (await this.gmailService.getLastHistoryId(userId)) || undefined,
        );

        if (historyRes.nextPageToken) {
          this.logger.log(
            `[User ${userId}] Found nextPageToken, emitting page 1 event...`,
          );
          await this.sleep(1000);
          this.eventEmitter.emit(
            'email.sync',
            new EmailSyncEvent(
              userId,
              historyRes.nextPageToken,
              1,
              firstDeletedIds,
            ),
          );
        } else {
          this.logger.log(`[User ${userId}] No more pages to sync.`);
        }
      } catch (error) {
        this.logger.error(`Error syncing history for user ${userId}`, error);
      }
      return;
    }

    // Xử lý các pages tiếp theo từ history API
    if (pageCount === 1 && pageToken) {
      try {
        this.logger.log(
          `[User ${userId}] Syncing history page ${pageCount} with pageToken...`,
        );

        const historyRes = await this.gmailService.getMailboxHistory(
          userId,
          undefined,
          100,
          pageToken,
        );

        this.logger.log(
          `[User ${userId}] Page ${pageCount} returned ${historyRes.history?.length || 0} records`,
        );

        const result = await this.emailSyncService.processHistoryRecords(
          userId,
          historyRes,
        );

        const allChangedEmailIds = [
          ...result.newEmailIds,
          ...(deletedEmailIds || []),
          ...result.deletedEmailIds,
        ];

        if (allChangedEmailIds.length > 0) {
          this.logger.log(
            `[User ${userId}] Notifying client about ${allChangedEmailIds.length} changed emails`,
          );
          this.snoozeGateway.notifyNewEmails(
            userId.toString(),
            allChangedEmailIds,
          );
        }

        // Continue with next page if exists
        if (historyRes.nextPageToken) {
          this.logger.log(
            `[User ${userId}] Found nextPageToken, emitting page ${pageCount + 1} event...`,
          );
          await this.sleep(1000);
          this.eventEmitter.emit(
            'email.sync',
            new EmailSyncEvent(userId, historyRes.nextPageToken, 1, [
              ...(deletedEmailIds || []),
              ...result.deletedEmailIds,
            ]),
          );
        } else {
          this.logger.log(
            `[User ${userId}] History sync job finished (all pages completed)`,
          );
          // Update lastHistoryId after all pages
          if (
            historyRes.historyId &&
            typeof historyRes.historyId === 'string'
          ) {
            await this.gmailService.updateLastHistoryId(
              userId,
              historyRes.historyId,
            );
            this.logger.log(
              `[User ${userId}] Final lastHistoryId updated: ${historyRes.historyId}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error syncing history pages for user ${userId}`,
          error,
        );
      }
      return;
    }

    // Xử lý pagination từ messages.list (pageCount > 1)
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
